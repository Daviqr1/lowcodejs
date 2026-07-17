/**
 * Remodel one-off (MANUAL, fora do boot): remove TODOS os relacionamentos de um
 * install — todo campo `type=RELATIONSHIP` e todos os artefatos gerados pela
 * definição (espelhos, definitions, links, FKs nas rows, paths de `_schema`,
 * configs de cascade-dropdown). MANTÉM tabelas, registros (rows) e todos os
 * campos não-relacionais. Efeito: as tabelas voltam ao estado sem nenhuma
 * associação.
 *
 * Artefatos removidos (varredura do backend — nada mais referencia relacionamento):
 *  1. `fields`   — Field docs `type=RELATIONSHIP` (source + espelho).
 *  2. `tables`   — tira o campo de `fields`/`fieldOrder*`/`groups[].fields` e
 *                  `$unset _schema.<slug>` de cada tabela afetada.
 *  3. `relationship-definitions` — deletadas (esvazia; índices preservados).
 *  4. `relationship-links`       — deletados.
 *  5. `cascade_dropdown_field_configs` — configs cujo parent é um campo
 *     RELATIONSHIP removido (extensão opcional `forms`; pulado se ausente).
 *  6. rows (DB data, collection = `table.slug`) — `$unset row[slug]` (única
 *     chave de row do relacionamento: OWNS_FK grava FK single; REVERSE nada;
 *     N:N só em links).
 *
 * É DESTRUTIVO e exige backup. Por isso:
 *  - dry-run por padrão: só analisa e imprime o plano (nenhuma escrita);
 *  - `--apply` escreve, e exige `--i-have-backup`;
 *  - `--table=<slug>` (opcional) restringe aos relacionamentos que tocam essa
 *    tabela (ambos os lados da definition); sem a flag, remove TODOS.
 *  - Idempotente: 2ª run acha 0 campos RELATIONSHIP → no-op. Não usa marker
 *    (decisão humana por install).
 *
 * Usage:
 *   node --import @swc-node/register/esm-register database/remodels/remove-all-relationships.ts
 *   node --import @swc-node/register/esm-register database/remodels/remove-all-relationships.ts --apply --i-have-backup
 *   node --import @swc-node/register/esm-register database/remodels/remove-all-relationships.ts --table=clientes --apply --i-have-backup
 *
 * Environment variables required:
 *   DATABASE_URL     - MongoDB connection string
 *   DB_DATABASE      - System database name (fields, tables, relationship-*)
 *   DB_DATA_DATABASE - Data database name (dynamic row collections)
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

import { TaskLogger } from '../shared/task-logger';

config({ path: '.env', quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;
const DB_DATABASE = process.env.DB_DATABASE || 'lowcodejs';
const DB_DATA_DATABASE = process.env.DB_DATA_DATABASE || 'lowcodejs_data';
const CASCADE_COLLECTION = 'cascade_dropdown_field_configs';
const TITLE = 'Remover todos os relacionamentos';

type ObjectId = mongoose.Types.ObjectId;

type Args = {
  apply: boolean;
  haveBackup: boolean;
  table: string | null;
};

type TableGroup = {
  slug?: string;
  fields?: ObjectId[];
};

type TableDoc = {
  _id: ObjectId;
  slug: string;
  fields?: ObjectId[];
  fieldOrderList?: ObjectId[];
  fieldOrderForm?: ObjectId[];
  fieldOrderFilter?: ObjectId[];
  fieldOrderDetail?: ObjectId[];
  groups?: TableGroup[];
  _schema?: Record<string, unknown>;
};

type Endpoint = {
  tableId: string;
  fieldId: string;
  fieldSlug: string;
};

// Acúmulo por tabela afetada: quais campos-relacionamento (id + slug) remover.
type TableTarget = {
  slugs: Set<string>;
  ids: Set<string>;
};

function parseArgs(argv: string[]): Args {
  let table: string | null = null;
  for (const arg of argv) {
    if (arg.startsWith('--table=')) table = arg.slice('--table='.length);
  }
  return {
    apply: argv.includes('--apply'),
    haveBackup: argv.includes('--i-have-backup'),
    table,
  };
}

// Ids de campos-relacionamento fisicamente presentes numa tabela (top-level +
// grupos legados), cruzados com o conjunto conhecido de RELATIONSHIP.
function relFieldEntriesInTable(
  table: TableDoc,
  slugById: Map<string, string>,
): Endpoint[] {
  const seen = new Set<string>();
  const entries: Endpoint[] = [];

  const push = (id: ObjectId): void => {
    const key = String(id);
    if (seen.has(key)) return;
    const slug = slugById.get(key);
    if (slug === undefined) return;
    seen.add(key);
    entries.push({ tableId: String(table._id), fieldId: key, fieldSlug: slug });
  };

  for (const id of table.fields ?? []) push(id);
  for (const group of table.groups ?? []) {
    for (const id of group.fields ?? []) push(id);
  }

  return entries;
}

function targetOf(map: Map<string, TableTarget>, tableId: string): TableTarget {
  let target = map.get(tableId);
  if (!target) {
    target = { slugs: new Set<string>(), ids: new Set<string>() };
    map.set(tableId, target);
  }
  return target;
}

// Remove os ids de campo de um array de ObjectId (fields / fieldOrder*).
function filterIds(
  ids: ObjectId[] | undefined,
  remove: Set<string>,
): ObjectId[] {
  const result: ObjectId[] = [];
  for (const id of ids ?? []) {
    if (!remove.has(String(id))) result.push(id);
  }
  return result;
}

async function migrate(): Promise<void> {
  const logger = new TaskLogger(TITLE);
  const args = parseArgs(process.argv.slice(2));

  if (!DATABASE_URL) {
    logger.failed('DATABASE_URL não configurada');
    process.exit(1);
  }
  if (args.apply && !args.haveBackup) {
    logger.failed(
      '--apply exige --i-have-backup (operação destrutiva; faça backup do MongoDB antes).',
    );
    process.exit(1);
  }

  const systemConn = mongoose.createConnection(DATABASE_URL, {
    dbName: DB_DATABASE,
  });
  await systemConn.asPromise();
  const dataConn = mongoose.createConnection(DATABASE_URL, {
    dbName: DB_DATA_DATABASE,
  });
  await dataConn.asPromise();

  const systemDb = systemConn.db!;
  const dataDb = dataConn.db!;

  try {
    logger.running();

    const fieldsCol = systemDb.collection('fields');
    const tablesCol = systemDb.collection<TableDoc>('tables');
    const defsCol = systemDb.collection('relationship-definitions');
    const linksCol = systemDb.collection('relationship-links');

    // Mapa id → slug de TODO campo RELATIONSHIP (materializado ou órfão).
    const relFieldDocs = await fieldsCol
      .find({ type: 'RELATIONSHIP' })
      .project({ slug: 1 })
      .toArray();
    const slugById = new Map<string, string>();
    for (const field of relFieldDocs) {
      slugById.set(String(field._id), String(field.slug));
    }

    if (slugById.size === 0) {
      logger.done('Nenhum campo RELATIONSHIP encontrado — nada a remover.');
      return;
    }

    const tables = await tablesCol.find({}).toArray();
    const tableById = new Map<string, TableDoc>();
    for (const table of tables) tableById.set(String(table._id), table);

    // ── Escopo ──────────────────────────────────────────────
    // byTable: tabela afetada → campos-relacionamento a remover dela.
    // defIds/relFieldIds: definitions e campos no escopo.
    const byTable = new Map<string, TableTarget>();
    const relFieldIds = new Set<string>();
    const selectedDefIds: ObjectId[] = [];

    const definitions = await defsCol.find({}).toArray();

    const addEndpoint = (endpoint: Endpoint): void => {
      const target = targetOf(byTable, endpoint.tableId);
      target.slugs.add(endpoint.fieldSlug);
      target.ids.add(endpoint.fieldId);
      relFieldIds.add(endpoint.fieldId);
    };

    // Definitions no escopo (todas, ou só as que tocam --table). Cada definition
    // dá os dois endpoints (source + espelho) com tableId/fieldId/fieldSlug.
    for (const definition of definitions) {
      const source = definition.source ?? {};
      const target = definition.target ?? {};
      const sourceSlug = String(source.table?.slug ?? '');
      const targetSlug = String(target.table?.slug ?? '');

      let inScope = true;
      if (args.table !== null) {
        inScope = sourceSlug === args.table || targetSlug === args.table;
      }
      if (!inScope) continue;

      selectedDefIds.push(definition._id);
      addEndpoint({
        tableId: String(source.table?._id ?? ''),
        fieldId: String(source.field?._id ?? ''),
        fieldSlug: String(source.field?.slug ?? ''),
      });
      addEndpoint({
        tableId: String(target.table?._id ?? ''),
        fieldId: String(target.field?._id ?? ''),
        fieldSlug: String(target.field?.slug ?? ''),
      });
    }

    // Campos RELATIONSHIP órfãos (sem definition) — varre a localização física.
    for (const table of tables) {
      if (args.table !== null && table.slug !== args.table) continue;
      for (const entry of relFieldEntriesInTable(table, slugById)) {
        addEndpoint(entry);
      }
    }

    // Filtros de deleção conforme escopo.
    let defFilter: Record<string, unknown> = {};
    let linkFilter: Record<string, unknown> = {};
    let fieldFilter: Record<string, unknown> = { type: 'RELATIONSHIP' };
    if (args.table !== null) {
      defFilter = { _id: { $in: selectedDefIds } };
      linkFilter = { relationshipId: { $in: selectedDefIds } };
      const relIdObjects = [...relFieldIds].map((id) =>
        mongoose.Types.ObjectId.createFromHexString(id),
      );
      fieldFilter = { _id: { $in: relIdObjects } };
    }

    const cascadeFieldIds = [...relFieldIds];
    const hasCascade =
      (await systemDb.listCollections({ name: CASCADE_COLLECTION }).toArray())
        .length > 0;

    // ── Contagens (dry-run e resumo) ────────────────────────
    const linkCount = await linksCol.countDocuments(linkFilter);
    let cascadeCount = 0;
    if (hasCascade && cascadeFieldIds.length > 0) {
      cascadeCount = await systemDb
        .collection(CASCADE_COLLECTION)
        .countDocuments({ parentFieldId: { $in: cascadeFieldIds } });
    }

    let rowCount = 0;
    for (const [tableId, target] of byTable) {
      const table = tableById.get(tableId);
      if (!table || target.slugs.size === 0) continue;
      const orConditions = [...target.slugs].map((slug) => ({
        [slug]: { $exists: true },
      }));
      const count = await dataDb
        .collection(table.slug)
        .countDocuments({ $or: orConditions });
      rowCount += count;
    }

    logger.item(
      `campos RELATIONSHIP: ${relFieldIds.size} | tabelas afetadas: ${byTable.size}`,
    );
    logger.item(
      `definitions: ${selectedDefIds.length} | links: ${linkCount} | rows c/ FK: ${rowCount}`,
    );
    let cascadeNote = '';
    if (!hasCascade) cascadeNote = ' (collection ausente)';
    logger.item(`cascade configs: ${cascadeCount}${cascadeNote}`);

    if (!args.apply) {
      logger.done(
        'DRY-RUN (nenhuma escrita). Reexecute com --apply --i-have-backup para aplicar.',
      );
      return;
    }

    // ── Aplicação ───────────────────────────────────────────
    // 1. Tabelas: remove campos de fields/fieldOrder*/groups + $unset _schema.
    for (const [tableId, target] of byTable) {
      const table = tableById.get(tableId);
      if (!table) continue;

      const newGroups = (table.groups ?? []).map((group): TableGroup => {
        return { ...group, fields: filterIds(group.fields, target.ids) };
      });

      const newSchema: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(table._schema ?? {})) {
        if (!target.slugs.has(key)) newSchema[key] = value;
      }

      await tablesCol.updateOne(
        { _id: table._id },
        {
          $set: {
            fields: filterIds(table.fields, target.ids),
            fieldOrderList: filterIds(table.fieldOrderList, target.ids),
            fieldOrderForm: filterIds(table.fieldOrderForm, target.ids),
            fieldOrderFilter: filterIds(table.fieldOrderFilter, target.ids),
            fieldOrderDetail: filterIds(table.fieldOrderDetail, target.ids),
            groups: newGroups,
            _schema: newSchema,
          },
        },
      );

      // 2. Rows: $unset das chaves de FK na collection dinâmica.
      if (target.slugs.size > 0) {
        const unset: Record<string, string> = {};
        for (const slug of target.slugs) unset[slug] = '';
        await dataDb.collection(table.slug).updateMany({}, { $unset: unset });
      }
    }

    // 3. Campos RELATIONSHIP.
    const deletedFields = await fieldsCol.deleteMany(fieldFilter);
    // 4. Links + definitions.
    const deletedLinks = await linksCol.deleteMany(linkFilter);
    const deletedDefs = await defsCol.deleteMany(defFilter);
    // 5. Cascade configs órfãos.
    let deletedCascade = 0;
    if (hasCascade && cascadeFieldIds.length > 0) {
      const result = await systemDb
        .collection(CASCADE_COLLECTION)
        .deleteMany({ parentFieldId: { $in: cascadeFieldIds } });
      deletedCascade = result.deletedCount ?? 0;
    }

    logger.done(
      `${deletedFields.deletedCount ?? 0} campos, ${deletedDefs.deletedCount ?? 0} definitions, ` +
        `${deletedLinks.deletedCount ?? 0} links, ${deletedCascade} cascade configs removidos ` +
        `em ${byTable.size} tabela(s).`,
    );

    // Recount pós-wipe: quantos relacionamentos sobraram no install inteiro
    // (0 = wipe completo; com --table, os de outras tabelas seguem contando).
    const remainingFields = await fieldsCol.countDocuments({
      type: 'RELATIONSHIP',
    });
    const remainingDefs = await defsCol.countDocuments({});
    const remainingLinks = await linksCol.countDocuments({});
    let remainingCascade = 0;
    if (hasCascade) {
      remainingCascade = await systemDb
        .collection(CASCADE_COLLECTION)
        .countDocuments({});
    }
    logger.item(
      `sobraram no install: ${remainingDefs} relacionamentos ` +
        `(${remainingFields} campos, ${remainingLinks} links, ${remainingCascade} cascade)`,
    );
  } finally {
    await systemConn.close();
    await dataConn.close();
  }
}

migrate().catch((error: unknown): void => {
  new TaskLogger(TITLE).failed(error);
  process.exit(1);
});
