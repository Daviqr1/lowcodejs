/**
 * Migration: consolida RelationshipDefinitions duplicadas por campo source.
 *
 * As migrations 15/23 e o double-submit no create/update de campo criavam uma
 * `RelationshipDefinition` (+ campo-espelho no target) SEM checar se ja existia
 * uma para aquele campo source — quando o `field.relationship.relationshipId`
 * nao era religado, a re-materializacao empilhava duplicatas. Resultado: um
 * mesmo campo source (ex.: `instituicoes.pais`) com 8 definitions e 8 espelhos
 * (`instituicoes-pais`, `-1` … `-6`) no target. A cardinalidade e derivada das
 * flags `multiple` de cada lado; com espelhos divergentes, o mesmo par resolve
 * como 1:1 E 1:N → leitura pelo lado errado (FK vs pivo) → relacionamento vazio.
 *
 * Chave de dedup: `source.field._id`. Um campo source deve ter no MAXIMO uma
 * definition. Campos source distintos no mesmo par de tabelas (ex.:
 * `instituicoes.pais` vs `instituicoes.paises`) sao relacionamentos legitimos e
 * NAO sao unidos.
 *
 * Para cada grupo de definitions nao-trashed com o mesmo `source.field._id`:
 *   1. Elege a canonica: a referenciada por `sourceField.relationship.relationshipId`;
 *      empate/ausente → a com mais links; empate → a mais antiga (createdAt).
 *   2. Repointa os `relationship-links` das perdedoras para a canonica
 *      (dedup por sourceId+targetId).
 *   3. Trasha as definitions perdedoras + seus campos-espelho (target.field._id)
 *      e remove esses espelhos de `fields[]`/`fieldOrder*` da tabela target.
 *   4. Ressincroniza as flags do espelho denormalizado (mirror.multiple/side/
 *      formMode) nos dois lados da canonica a partir do `field.multiple` real.
 *   5. Religa o campo source a canonica (`relationship.relationshipId`).
 *
 * Ao final, cria o indice UNIQUE parcial em `source.field._id` (trashed:false),
 * garantia dura contra novas duplicatas — so pode ser criado depois da limpeza.
 *
 * N:N com 0 links sao apenas LOGADOS (nao ha origem embedded para reconstruir;
 * decisao humana).
 *
 * Idempotente via marker no Setting singleton:
 *   MIGRATION_RELATIONSHIP_DEDUP_AT
 *
 * Usage:
 *   node --import @swc-node/register/esm-register database/migrations/28-migrate-relationship-dedup-consolidate.ts
 *   (boot Docker roda via scripts/migrations/28-migrate-relationship-dedup-consolidate.sh)
 *
 * Environment variables required:
 *   DATABASE_URL     - MongoDB connection string
 *   DB_DATABASE      - System database name (fields, tables, relationship-*)
 */

import mongoose from 'mongoose';

import { runMigration } from '../shared/migration-runner';
import type { TaskLogger } from '../shared/task-logger';

const TITLE =
  'Consolidacao de RelationshipDefinitions duplicadas por campo source';

type ObjectId = mongoose.Types.ObjectId;

type FieldDoc = {
  _id: ObjectId;
  slug: string;
  multiple?: boolean;
  relationship?: {
    relationshipId?: ObjectId | null;
    mirror?: { multiple?: boolean; visible?: boolean; label?: string } | null;
  } | null;
};

type Endpoint = {
  table: { _id: ObjectId; slug: string };
  field: { _id: ObjectId; slug: string };
  visible?: boolean;
  label?: string;
};

type DefDoc = {
  _id: ObjectId;
  name?: string;
  source: Endpoint;
  target: Endpoint;
  createdAt?: Date;
  trashed?: boolean;
};

type LinkDoc = {
  _id: ObjectId;
  relationshipId: ObjectId;
  sourceId: ObjectId;
  targetId: ObjectId;
};

type TableDoc = {
  _id: ObjectId;
  fields?: ObjectId[];
  fieldOrderList?: ObjectId[];
  fieldOrderForm?: ObjectId[];
  fieldOrderFilter?: ObjectId[];
  fieldOrderDetail?: ObjectId[];
};

function createdAtMs(def: DefDoc): number {
  if (!def.createdAt) return 0;
  return def.createdAt.getTime();
}

// Elege a definition canonica de um grupo (mesmo source.field._id).
function electCanonical(group: DefDoc[], sourceField: FieldDoc | null): DefDoc {
  const pointed = sourceField?.relationship?.relationshipId;
  if (pointed) {
    const match = group.find((d) => d._id.equals(pointed));
    if (match) return match;
  }
  // fallback: mais antiga (createdAt asc) — determinístico e estável.
  return [...group].sort((a, b) => createdAtMs(a) - createdAtMs(b))[0];
}

async function consolidateGroup(
  systemDb: mongoose.mongo.Db,
  sourceFieldId: string,
  group: DefDoc[],
  logger: TaskLogger,
): Promise<number> {
  const defsCol = systemDb.collection<DefDoc>('relationship-definitions');
  const fieldsCol = systemDb.collection<FieldDoc>('fields');
  const linksCol = systemDb.collection<LinkDoc>('relationship-links');
  const tablesCol = systemDb.collection<TableDoc>('tables');

  // Contagem de links por def, para o critério de eleição secundário.
  const linkCounts = new Map<string, number>();
  for (const d of group) {
    linkCounts.set(
      d._id.toString(),
      await linksCol.countDocuments({ relationshipId: d._id }),
    );
  }

  const sourceField = await fieldsCol.findOne({
    _id: group[0].source.field._id,
  });

  // Eleição: relationshipId apontado > mais links > mais antiga.
  let canonical = electCanonical(group, sourceField);
  const maxLinks = Math.max(
    ...group.map((d) => linkCounts.get(d._id.toString()) ?? 0),
  );
  const pointed = sourceField?.relationship?.relationshipId;
  const pointedMatch = pointed && group.find((d) => d._id.equals(pointed));
  if (!pointedMatch && maxLinks > 0) {
    canonical =
      group.find((d) => (linkCounts.get(d._id.toString()) ?? 0) === maxLinks) ??
      canonical;
  }

  const losers = group.filter((d) => !d._id.equals(canonical._id));
  if (losers.length === 0) return 0;

  for (const loser of losers) {
    // 1. Repointa links do loser → canônica, dedup por sourceId+targetId.
    const loserLinks = await linksCol
      .find({ relationshipId: loser._id })
      .toArray();
    for (const link of loserLinks) {
      const dup = await linksCol.findOne({
        relationshipId: canonical._id,
        sourceId: link.sourceId,
        targetId: link.targetId,
      });
      if (dup) {
        await linksCol.deleteOne({ _id: link._id });
      } else {
        await linksCol.updateOne(
          { _id: link._id },
          { $set: { relationshipId: canonical._id } },
        );
      }
    }

    // 2. Trasha o campo-espelho órfão do loser (target.field._id).
    const mirrorId = loser.target.field._id;
    await fieldsCol.updateOne(
      { _id: mirrorId },
      { $set: { trashed: true, trashedAt: new Date() } },
    );

    // 3. Remove o espelho de fields[]/fieldOrder* da tabela target (some da UI).
    await tablesCol.updateOne(
      { _id: loser.target.table._id },
      {
        $pull: {
          fields: mirrorId,
          fieldOrderList: mirrorId,
          fieldOrderForm: mirrorId,
          fieldOrderFilter: mirrorId,
          fieldOrderDetail: mirrorId,
        },
      },
    );

    // 4. Trasha a definition perdedora.
    await defsCol.updateOne(
      { _id: loser._id },
      { $set: { trashed: true, trashedAt: new Date() } },
    );
  }

  // 5. Religa o campo source à canônica (se divergia).
  await fieldsCol.updateOne(
    { _id: group[0].source.field._id },
    { $set: { 'relationship.relationshipId': canonical._id } },
  );

  logger.item(
    `source.field ${sourceFieldId} (${sourceField?.slug ?? '??'}): ` +
      `${losers.length} defs duplicadas consolidadas em ${canonical._id.toString()}`,
  );
  return losers.length;
}

// Ressincroniza o espelho denormalizado (mirror) dos dois lados de uma
// definition a partir do `field.multiple` real de cada lado.
async function resyncMirrors(
  systemDb: mongoose.mongo.Db,
  def: DefDoc,
): Promise<void> {
  const fieldsCol = systemDb.collection<FieldDoc>('fields');
  const sourceField = await fieldsCol.findOne({ _id: def.source.field._id });
  const targetField = await fieldsCol.findOne({ _id: def.target.field._id });
  if (!sourceField || !targetField) return;

  const sourceMultiple = Boolean(sourceField.multiple);
  const targetMultiple = Boolean(targetField.multiple);
  const nn = sourceMultiple && targetMultiple;

  // N:N → gestão inline nos dois lados; caso contrário select. Set explícito
  // (não spread condicional) para não deixar um `manage` obsoleto quando o campo
  // deixa de ser N:N.
  let formMode: 'select' | 'manage' = 'select';
  if (nn) formMode = 'manage';

  // Espelho do source descreve o lado oposto (target).
  await fieldsCol.updateOne(
    { _id: sourceField._id },
    {
      $set: {
        'relationship.side': 'source',
        'relationship.mirror.multiple': targetMultiple,
        'relationship.formMode': formMode,
      },
    },
  );
  // Espelho do target descreve o lado oposto (source).
  await fieldsCol.updateOne(
    { _id: targetField._id },
    {
      $set: {
        'relationship.side': 'target',
        'relationship.mirror.multiple': sourceMultiple,
        'relationship.formMode': formMode,
      },
    },
  );
}

await runMigration({
  title: TITLE,
  marker: 'MIGRATION_RELATIONSHIP_DEDUP_AT',
  async run({ db, logger }): Promise<string> {
    const systemDb = db;

    const defsCol = systemDb.collection<DefDoc>('relationship-definitions');
    const linksCol = systemDb.collection<LinkDoc>('relationship-links');
    const fieldsCol = systemDb.collection<FieldDoc>('fields');

    const defs = await defsCol.find({ trashed: { $ne: true } }).toArray();

    // Agrupa por source.field._id.
    const groups = new Map<string, DefDoc[]>();
    for (const d of defs) {
      const key = d.source.field._id.toString();
      const arr = groups.get(key) ?? [];
      arr.push(d);
      groups.set(key, arr);
    }

    let consolidated = 0;
    let groupsFixed = 0;
    for (const [sourceFieldId, group] of groups) {
      if (group.length <= 1) continue;
      const removed = await consolidateGroup(
        systemDb,
        sourceFieldId,
        group,
        logger,
      );
      if (removed > 0) {
        consolidated += removed;
        groupsFixed++;
      }
    }

    // Ressincroniza as flags de espelho de todas as definitions sobreviventes.
    const survivors = await defsCol.find({ trashed: { $ne: true } }).toArray();
    for (const def of survivors) {
      await resyncMirrors(systemDb, def);
    }

    // Relatório: N:N (ambos multiple) com 0 links — sem origem para reconstruir.
    let nnZeroLinks = 0;
    for (const def of survivors) {
      const sf = await fieldsCol.findOne({ _id: def.source.field._id });
      const tf = await fieldsCol.findOne({ _id: def.target.field._id });
      if (Boolean(sf?.multiple) && Boolean(tf?.multiple)) {
        const count = await linksCol.countDocuments({
          relationshipId: def._id,
        });
        if (count === 0) {
          nnZeroLinks++;
          logger.item(
            `N:N sem links (revisar manualmente): ${def.name ?? def._id.toString()}`,
          );
        }
      }
    }

    // Índice UNIQUE parcial: garantia dura de 1 def por campo source. Só aqui,
    // após a limpeza (com duplicatas ainda no banco, a criação falharia).
    await defsCol.createIndex(
      { 'source.field._id': 1 },
      {
        unique: true,
        partialFilterExpression: { trashed: false },
        name: 'uniq_source_field_not_trashed',
      },
    );

    return (
      `${groupsFixed} grupos consolidados (${consolidated} defs duplicadas trashadas), ` +
      `${survivors.length} definitions ativas, ${nnZeroLinks} N:N sem links reportadas`
    );
  },
});
