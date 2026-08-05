/**
 * Remodel one-off (MANUAL, fora do boot): converte um FIELD_GROUP usado como
 * "falso relacionamento" (subdocumentos embedded dentro do registro pai) numa
 * TABELA INDEPENDENTE + RelationshipDefinition (1:N) + RelationshipLink por item.
 *
 * Cenário (ex.: labgestor): a tabela `equipamento` tem um grupo `agendamentos`
 * cujos itens vivem embedded em `row.agendamentos[]`. Isso não é associação entre
 * tabelas (é composição), então não há tabela própria, CRUD, menu nem filtragem
 * consistente (§1/§2/§11). Este script extrai cada item para uma nova tabela
 * (`equipamento-agendamentos`) e liga via links: `equipamento (1) → C (N)`.
 *
 * É DESTRUTIVO quando `--drop-group` é usado e exige backup. Por isso:
 *  - dry-run por padrão: só analisa e imprime o plano (nenhuma escrita);
 *  - `--apply` escreve, e exige `--i-have-backup`;
 *  - `--drop-group` (opcional, só com `--apply`) remove o grupo e o embedded da
 *    origem APÓS validar contagem (item embedded == registro em C == link).
 *  - NÃO é idempotente por marker: depende de decisão humana por tabela/grupo.
 *
 * Usage:
 *   node --import @swc-node/register/esm-register database/remodels/migrate-fieldgroup-to-relationship.ts --table=equipamento --group=agendamentos
 *   node --import @swc-node/register/esm-register database/remodels/migrate-fieldgroup-to-relationship.ts --table=equipamento --group=agendamentos --apply --i-have-backup
 *   node --import @swc-node/register/esm-register database/remodels/migrate-fieldgroup-to-relationship.ts --table=equipamento --group=agendamentos --apply --i-have-backup --drop-group
 *
 * Environment variables required:
 *   DATABASE_URL     - MongoDB connection string
 *   DB_DATABASE      - System database name (tables, fields, relationship-*)
 *   DB_DATA_DATABASE - Data database name (dynamic row collections)
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

import {
  buildDefaultTablePermissions,
  buildFieldPermissions,
  E_RELATIONSHIP_ON_DELETE,
  E_SCHEMA_TYPE,
  E_TABLE_PROFILE,
  E_TABLE_STYLE,
  E_TABLE_TYPE,
} from '../../application/core/entity.core';
import SlugService from '../../application/services/slug/slug.service';
import { TaskLogger } from '../shared/task-logger';

// Remodel roda fora do container de DI — instancia direto. O SlugService e
// puro (constructor sem argumentos).
const slugService = new SlugService();

config({ path: '.env', quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;
const DB_DATABASE = process.env.DB_DATABASE || 'lowcodejs';
const DB_DATA_DATABASE = process.env.DB_DATA_DATABASE || 'lowcodejs_data';
const TITLE = 'Remodel FIELD_GROUP → relacionamento';

type ObjectId = mongoose.Types.ObjectId;

type FieldDoc = {
  _id: ObjectId;
  name?: string;
  slug: string;
  type?: string;
  required?: boolean;
  multiple?: boolean;
  native?: boolean;
  group?: { slug?: string; _id?: ObjectId } | null;
};

type GroupConfig = {
  _id?: ObjectId;
  slug: string;
  name?: string;
  fields?: ObjectId[];
};

type TableDoc = {
  _id: ObjectId;
  name?: string;
  slug: string;
  owner?: ObjectId;
  fields?: ObjectId[];
  groups?: GroupConfig[];
  fieldOrderList?: ObjectId[];
  fieldOrderForm?: ObjectId[];
  fieldOrderFilter?: ObjectId[];
  fieldOrderDetail?: ObjectId[];
};

type Args = {
  table: string;
  group: string;
  apply: boolean;
  haveBackup: boolean;
  dropGroup: boolean;
};

function parseArgs(argv: string[]): Args | null {
  let table = '';
  let group = '';
  for (const arg of argv) {
    if (arg.startsWith('--table=')) table = arg.slice('--table='.length);
    if (arg.startsWith('--group=')) group = arg.slice('--group='.length);
  }
  if (!table || !group) return null;
  return {
    table,
    group,
    apply: argv.includes('--apply'),
    haveBackup: argv.includes('--i-have-backup'),
    dropGroup: argv.includes('--drop-group'),
  };
}

// Fragmento de _schema por campo (grupos só contêm tipos simples — §2 proíbe
// RELATIONSHIP e grupo-em-grupo). Espelha o MongooseSchemaBuilder o suficiente
// para a tabela nova funcionar; é reconstruído ao editar qualquer campo de C.
function schemaFragmentFor(field: FieldDoc): unknown {
  const type = field.type ?? '';
  const required = Boolean(field.required);

  const arrayObjectId = (ref: string): unknown => {
    return [{ type: E_SCHEMA_TYPE.OBJECT_ID, required: false, ref }];
  };

  if (type === 'FILE') return arrayObjectId('Storage');
  if (type === 'USER' || type === 'CREATOR' || type === 'UPDATER') {
    return arrayObjectId('User');
  }
  // RELATIONSHIP: array de OBJECT_ID sem `required` (valores vivem nos links). O
  // `ref` correto (tabela do outro lado) é setado explicitamente após criar C.
  if (type === 'RELATIONSHIP') {
    return [{ type: E_SCHEMA_TYPE.OBJECT_ID, required: false }];
  }
  if (type === 'IDENTIFIER') {
    return { type: E_SCHEMA_TYPE.OBJECT_ID, required: false };
  }
  if (type === 'DROPDOWN' || type === 'CATEGORY') {
    return [{ type: E_SCHEMA_TYPE.STRING, required }];
  }
  if (type === 'DATE' || type === 'CREATED_AT' || type === 'UPDATED_AT') {
    return { type: E_SCHEMA_TYPE.DATE, required };
  }
  if (type === 'TRASHED_AT') {
    return { type: E_SCHEMA_TYPE.DATE, required: false };
  }
  // TEXT_SHORT, TEXT_LONG, STATUS e fallback seguro.
  if (field.multiple) return [{ type: E_SCHEMA_TYPE.STRING, required }];
  return { type: E_SCHEMA_TYPE.STRING, required };
}

function buildSchema(fields: FieldDoc[]): Record<string, unknown> {
  const schema: Record<string, unknown> = {};
  for (const field of fields) {
    schema[field.slug] = schemaFragmentFor(field);
  }
  return schema;
}

// Clona um Field doc existente (nativo ou subcampo do grupo) com novo _id, fora
// de qualquer grupo, timestamps frescos. Reaproveitar docs reais evita errar o
// shape de campos nativos.
function cloneFieldDoc(
  source: Record<string, unknown>,
  now: Date,
): Record<string, unknown> {
  const clone: Record<string, unknown> = { ...source };
  clone._id = new mongoose.Types.ObjectId();
  clone.group = null;
  clone.createdAt = now;
  clone.updatedAt = now;
  clone.trashed = false;
  clone.trashedAt = null;
  return clone;
}

function buildRelationshipFieldDoc(params: {
  _id: ObjectId;
  name: string;
  slug: string;
  multiple: boolean;
  visible: boolean;
  refTable: TableDoc;
  refField: { _id: ObjectId; slug: string };
  relationshipId: ObjectId;
  now: Date;
}): Record<string, unknown> {
  return {
    _id: params._id,
    name: params.name,
    slug: params.slug,
    type: 'RELATIONSHIP',
    required: false,
    multiple: params.multiple,
    format: null,
    showInFilter: false,
    permissions: buildFieldPermissions(true, true, true),
    widthInForm: 50,
    widthInList: 10,
    widthInDetail: null,
    tip: null,
    defaultValue: null,
    locked: false,
    native: false,
    allowCustomDropdownOptions: false,
    allowCreateRelationshipRecords: true,
    relationship: {
      table: { _id: params.refTable._id, slug: params.refTable.slug },
      field: { _id: params.refField._id, slug: params.refField.slug },
      order: 'asc',
      customLabel: false,
      labelParts: [],
      labelSeparator: ' - ',
      visible: params.visible,
      relationshipId: params.relationshipId,
    },
    dropdown: [],
    category: [],
    group: null,
    createdAt: params.now,
    updatedAt: params.now,
    trashed: false,
    trashedAt: null,
  };
}

async function uniqueTableSlug(
  systemDb: mongoose.mongo.Db,
  base: string,
): Promise<string> {
  const tablesCol = systemDb.collection('tables');
  let candidate = base;
  let counter = 2;
  while (await tablesCol.findOne({ slug: candidate })) {
    candidate = `${base}-${counter}`;
    counter++;
  }
  return candidate;
}

async function migrate(): Promise<void> {
  const logger = new TaskLogger(TITLE);
  const args = parseArgs(process.argv.slice(2));

  if (!args) {
    logger.failed(
      'Uso: --table=<slug> --group=<id|slug> [--apply --i-have-backup] [--drop-group]',
    );
    process.exit(1);
  }
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

    const tablesCol = systemDb.collection<TableDoc>('tables');
    const fieldsCol = systemDb.collection<FieldDoc>('fields');

    const sourceTable = await tablesCol.findOne({ slug: args.table });
    if (!sourceTable) {
      logger.failed(`Tabela "${args.table}" não encontrada`);
      return;
    }

    // Resolve o grupo (por _id ou slug) e o campo FIELD_GROUP pai (cujo slug é a
    // chave do array embedded nas rows).
    const groups = sourceTable.groups ?? [];
    let group: GroupConfig | null = null;
    for (const candidate of groups) {
      if (candidate.slug === args.group) group = candidate;
      if (candidate._id && String(candidate._id) === args.group) {
        group = candidate;
      }
    }
    if (!group) {
      logger.failed(
        `Grupo "${args.group}" não encontrado na tabela "${args.table}"`,
      );
      return;
    }

    const groupFieldSlug = group.slug;
    const subFieldIds = group.fields ?? [];
    const subFields = await fieldsCol
      .find({ _id: { $in: subFieldIds } })
      .toArray();
    if (subFields.length === 0) {
      logger.failed(`Grupo "${args.group}" não tem subcampos`);
      return;
    }

    // Lê os itens embedded de todas as rows da origem.
    const sourceCol = dataDb.collection(sourceTable.slug);
    const sourceRows = await sourceCol
      .find({ [groupFieldSlug]: { $exists: true, $nin: [null, []] } })
      .toArray();

    let totalItems = 0;
    for (const row of sourceRows) {
      const items = row[groupFieldSlug];
      if (Array.isArray(items)) totalItems += items.length;
    }

    const newTableSlug = await uniqueTableSlug(
      systemDb,
      slugService.normalize(`${sourceTable.slug}-${groupFieldSlug}`),
    );

    logger.item(
      `Origem: ${sourceTable.slug} | grupo: ${groupFieldSlug} | subcampos: ${subFields.length}`,
    );
    logger.item(
      `Nova tabela: ${newTableSlug} | rows com itens: ${sourceRows.length} | itens embedded: ${totalItems}`,
    );

    if (!args.apply) {
      logger.done(
        'DRY-RUN (nenhuma escrita). Reexecute com --apply --i-have-backup para aplicar.',
      );
      return;
    }

    const now = new Date();

    // 1. Campos de C: clones dos nativos da origem + clones dos subcampos.
    const sourceNativeDocs = await fieldsCol
      .find({ _id: { $in: sourceTable.fields ?? [] }, native: true })
      .toArray();

    const newFieldDocs: Record<string, unknown>[] = [];
    for (const native of sourceNativeDocs) {
      newFieldDocs.push(cloneFieldDoc(native, now));
    }
    const subFieldSlugByClone: { slug: string }[] = [];
    for (const sub of subFields) {
      const clone = cloneFieldDoc(sub, now);
      newFieldDocs.push(clone);
      subFieldSlugByClone.push({ slug: sub.slug });
    }

    const newFieldsTyped: FieldDoc[] = newFieldDocs.map((doc): FieldDoc => {
      return {
        _id: mongoose.Types.ObjectId.createFromHexString(String(doc._id)),
        slug: String(doc.slug),
        type: String(doc.type ?? ''),
        multiple: Boolean(doc.multiple),
        native: Boolean(doc.native),
      };
    });

    // 2. Relacionamento source(1) → C(N): campo na origem (multiple) + espelho em C.
    const definitionId = new mongoose.Types.ObjectId();
    const sourceRelFieldId = new mongoose.Types.ObjectId();
    const mirrorFieldId = new mongoose.Types.ObjectId();
    const newTableId = new mongoose.Types.ObjectId();
    const newTableName = `${sourceTable.name ?? sourceTable.slug} - ${group.name ?? groupFieldSlug}`;
    const sourceRelSlug = slugService.normalize(`${groupFieldSlug}-rel`);
    const mirrorSlug = slugService.normalize(`${sourceTable.slug}-rel`);

    const newTableStub: TableDoc = {
      _id: newTableId,
      name: newTableName,
      slug: newTableSlug,
    };

    const mirrorDoc = buildRelationshipFieldDoc({
      _id: mirrorFieldId,
      name: sourceTable.name ?? sourceTable.slug,
      slug: mirrorSlug,
      multiple: false,
      visible: true,
      refTable: sourceTable,
      refField: { _id: sourceRelFieldId, slug: sourceRelSlug },
      relationshipId: definitionId,
      now,
    });
    newFieldDocs.push(mirrorDoc);
    newFieldsTyped.push({
      _id: mirrorFieldId,
      slug: mirrorSlug,
      type: 'RELATIONSHIP',
      multiple: false,
    });

    const sourceRelDoc = buildRelationshipFieldDoc({
      _id: sourceRelFieldId,
      name: group.name ?? groupFieldSlug,
      slug: sourceRelSlug,
      multiple: true,
      visible: true,
      refTable: newTableStub,
      refField: { _id: mirrorFieldId, slug: mirrorSlug },
      relationshipId: definitionId,
      now,
    });

    // 3. Persiste campos de C, a tabela C e o campo de relacionamento da origem.
    // Handle nao-tipado para os inserts de docs crus (Record dinamico): as
    // colecoes tipadas acima servem as queries; os docs montados aqui sao crus.
    const fieldsWriteCol = systemDb.collection('fields');
    await fieldsWriteCol.insertMany(newFieldDocs);
    await fieldsWriteCol.insertOne(sourceRelDoc);

    const registeredGroup = await systemDb
      .collection('user-groups')
      .findOne({ slug: 'REGISTERED' });
    let registeredGroupId: string | null = null;
    if (registeredGroup?._id) registeredGroupId = String(registeredGroup._id);

    const newFieldIds = newFieldDocs.map(
      (doc): ObjectId =>
        mongoose.Types.ObjectId.createFromHexString(String(doc._id)),
    );

    await systemDb.collection('tables').insertOne({
      _id: newTableId,
      name: newTableName,
      slug: newTableSlug,
      type: E_TABLE_TYPE.TABLE,
      style: E_TABLE_STYLE.LIST,
      owner: sourceTable.owner,
      permissions: buildDefaultTablePermissions(registeredGroupId),
      members: [{ user: sourceTable.owner, profile: E_TABLE_PROFILE.OWNER }],
      fields: newFieldIds,
      fieldOrderList: newFieldIds,
      fieldOrderForm: newFieldIds,
      fieldOrderFilter: newFieldIds,
      fieldOrderDetail: newFieldIds,
      groups: [],
      _schema: buildSchema(newFieldsTyped),
      createdAt: now,
      updatedAt: now,
      trashed: false,
      trashedAt: null,
    });

    // Ref do _schema do campo-espelho em C aponta para a tabela origem.
    await tablesCol.updateOne(
      { _id: newTableId },
      {
        $set: {
          [`_schema.${mirrorSlug}`]: [
            {
              type: E_SCHEMA_TYPE.OBJECT_ID,
              required: false,
              ref: sourceTable._id.toString(),
            },
          ],
        },
      },
    );

    // 4. RelationshipDefinition (1:N, source é o "um").
    await systemDb.collection('relationship-definitions').insertOne({
      _id: definitionId,
      name: `${sourceTable.name ?? sourceTable.slug} ↔ ${newTableName}`,
      source: {
        table: { _id: sourceTable._id, slug: sourceTable.slug },
        field: { _id: sourceRelFieldId, slug: sourceRelSlug },
        visible: true,
        label: group.name ?? groupFieldSlug,
      },
      target: {
        table: { _id: newTableId, slug: newTableSlug },
        field: { _id: mirrorFieldId, slug: mirrorSlug },
        visible: true,
        label: sourceTable.name ?? sourceTable.slug,
      },
      onDelete: E_RELATIONSHIP_ON_DELETE.CASCADE,
      trashed: false,
      trashedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    // 5. Liga o campo de relacionamento na origem (fields + fieldOrder* + _schema).
    await tablesCol.updateOne(
      { _id: sourceTable._id },
      {
        $addToSet: {
          fields: sourceRelFieldId,
          fieldOrderList: sourceRelFieldId,
          fieldOrderForm: sourceRelFieldId,
          fieldOrderFilter: sourceRelFieldId,
          fieldOrderDetail: sourceRelFieldId,
        },
        $set: {
          [`_schema.${sourceRelSlug}`]: [
            {
              type: E_SCHEMA_TYPE.OBJECT_ID,
              required: false,
              ref: newTableId.toString(),
            },
          ],
        },
      },
    );

    // 6. Extrai cada item embedded → registro em C + link.
    const newCol = dataDb.collection(newTableSlug);
    const linksCol = systemDb.collection('relationship-links');
    let recordsCreated = 0;
    let linksCreated = 0;
    for (const row of sourceRows) {
      const items = row[groupFieldSlug];
      if (!Array.isArray(items)) continue;
      let order = 0;
      for (const item of items) {
        const record: Record<string, unknown> = {
          _id: new mongoose.Types.ObjectId(),
          createdAt: now,
          updatedAt: now,
          status: 'published',
          trashedAt: null,
        };
        if (row.creator) record.creator = row.creator;
        if (item && typeof item === 'object') {
          for (const sub of subFieldSlugByClone) {
            const itemRecord: Record<string, unknown> = { ...item };
            if (sub.slug in itemRecord) record[sub.slug] = itemRecord[sub.slug];
          }
        }
        const inserted = await newCol.insertOne(record);
        recordsCreated++;

        await linksCol.updateOne(
          {
            relationshipId: definitionId,
            sourceId: row._id,
            targetId: inserted.insertedId,
          },
          {
            $setOnInsert: {
              relationshipId: definitionId,
              sourceId: row._id,
              targetId: inserted.insertedId,
              order,
              metadata: null,
              createdAt: now,
              updatedAt: now,
            },
          },
          { upsert: true },
        );
        linksCreated++;
        order++;
      }
    }

    // 7. Validação de contagem (item embedded == registro em C == link).
    const okCounts =
      recordsCreated === totalItems && linksCreated === totalItems;
    if (!okCounts) {
      logger.failed(
        `Divergência: itens=${totalItems}, registros=${recordsCreated}, links=${linksCreated}. ` +
          `NÃO removendo o grupo da origem. Revise e restaure do backup se necessário.`,
      );
      return;
    }

    // 8. (Opcional, destrutivo) remove o grupo e o embedded da origem.
    if (args.dropGroup) {
      const remainingGroups = groups.filter(
        (candidate): boolean => candidate.slug !== groupFieldSlug,
      );
      await tablesCol.updateOne(
        { _id: sourceTable._id },
        {
          $set: { groups: remainingGroups },
          $unset: { [`_schema.${groupFieldSlug}`]: '' },
        },
      );
      await sourceCol.updateMany({}, { $unset: { [groupFieldSlug]: '' } });
      logger.item(
        `Grupo "${groupFieldSlug}" e embedded removidos da origem (--drop-group).`,
      );
    }

    let groupNote =
      ' Grupo da origem preservado (use --drop-group para remover).';
    if (args.dropGroup) groupNote = '';
    logger.done(
      `Tabela "${newTableSlug}" criada com ${recordsCreated} registros e ${linksCreated} links (1:N).${groupNote}`,
    );
  } finally {
    await systemConn.close();
    await dataConn.close();
  }
}

try {
  await migrate();
} catch (error) {
  new TaskLogger(TITLE).failed(error);
  process.exit(1);
}
