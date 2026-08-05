/**
 * Migration: limpa RelationshipDefinitions com tabela source ou target ausente.
 *
 * Quando uma tabela é deletada sem que o cleanupTable() do RelationshipDeletionService
 * quarentenasse os mirrors (bug corrigido neste branch), definitions ficaram com
 * source.table._id ou target.table._id apontando para tabelas inexistentes. Esses
 * campos espelho sobreviventes aparecem na UI como "Relacionamento não configurado".
 *
 * Esta migration:
 *   1. Carrega todas as relationship-definitions não-trashed.
 *   2. Para cada definition com source ou target ausente:
 *      a. Busca todos os campos com relationship.relationshipId == definition._id.
 *      b. Quarentena cada campo sobrevivente (trashed=true + remove de fieldOrder* e fields[]).
 *      c. Remove o _schema path da tabela pai.
 *      d. Deleta todos os links da definition.
 *      e. Deleta a definition.
 *   3. Grava marker MIGRATION_RELATIONSHIP_BROKEN_DEFINITIONS_AT quando tudo ok.
 *
 * Idempotente: re-rodar é seguro (definitions já deletadas não são encontradas).
 *
 * Usage:
 *   node --import @swc-node/register/esm-register database/migrations/26-migrate-relationship-cleanup-broken-definitions.ts
 *   (boot Docker roda via scripts/migrations/26-migrate-relationship-cleanup-broken-definitions.sh)
 *
 * Environment variables required:
 *   DATABASE_URL  - MongoDB connection string
 *   DB_DATABASE   - System database name (fields, tables, relationship-*)
 */

import mongoose from 'mongoose';

import { runMigration } from '../shared/migration-runner';
import type { TaskLogger } from '../shared/task-logger';

const TITLE = 'Limpeza de definitions de relacionamento quebradas';

type ObjectId = mongoose.Types.ObjectId;

type DefinitionDoc = {
  _id: ObjectId;
  trashed?: boolean;
  source?: { table?: { _id?: ObjectId | null } };
  target?: { table?: { _id?: ObjectId | null } };
};

type FieldDoc = {
  _id: ObjectId;
  slug: string;
  group?: unknown;
};

type TableDoc = {
  _id: ObjectId;
  slug: string;
  _schema?: Record<string, unknown>;
};

async function cleanupBrokenDefinitions(
  db: mongoose.mongo.Db,
  logger: TaskLogger,
): Promise<{ definitions: number; fields: number }> {
  const defsCol = db.collection<DefinitionDoc>('relationship-definitions');
  const linksCol = db.collection('relationship-links');
  const fieldsCol = db.collection<FieldDoc>('fields');
  const tablesCol = db.collection<TableDoc>('tables');

  const definitions = await defsCol.find({ trashed: { $ne: true } }).toArray();

  let cleanedDefinitions = 0;
  let cleanedFields = 0;
  const now = new Date();

  for (const definition of definitions) {
    const sourceTableId = definition.source?.table?._id;
    const targetTableId = definition.target?.table?._id;

    let broken = false;

    if (sourceTableId) {
      const sourceExists = await tablesCol.findOne({
        _id: sourceTableId,
        trashed: { $ne: true },
      });
      if (!sourceExists) broken = true;
    } else {
      broken = true;
    }

    if (!broken && targetTableId) {
      const targetExists = await tablesCol.findOne({
        _id: targetTableId,
        trashed: { $ne: true },
      });
      if (!targetExists) broken = true;
    } else if (!broken) {
      broken = true;
    }

    if (!broken) continue;

    const survivingFields = await fieldsCol
      .find({
        'relationship.relationshipId': definition._id,
        trashed: { $ne: true },
      })
      .toArray();

    for (const field of survivingFields) {
      await fieldsCol.updateOne(
        { _id: field._id },
        { $set: { trashed: true, trashedAt: now } },
      );

      // Captura a tabela pai ANTES do $pull para poder fazer o $unset do _schema.
      const parentTable = await tablesCol.findOne(
        { fields: field._id },
        { projection: { _id: 1 } },
      );
      let tableWithGroup: TableDoc | null = null;
      if (!parentTable) {
        tableWithGroup = await tablesCol.findOne(
          { 'groups.fields': field._id },
          { projection: { _id: 1 } },
        );
      }

      await tablesCol.updateMany(
        { fields: field._id },
        {
          $pull: {
            fields: field._id,
            fieldOrderList: field._id,
            fieldOrderForm: field._id,
            fieldOrderFilter: field._id,
            fieldOrderDetail: field._id,
          },
        },
      );

      if (parentTable) {
        await tablesCol.updateOne(
          { _id: parentTable._id },
          { $unset: { [`_schema.${field.slug}`]: '' } },
        );
      } else if (tableWithGroup) {
        // $pull com filtro posicional `$[g]`: chave dinâmica que o tipo
        // PullOperator do driver não expressa. Tipar o update como Record
        // evita asserção no literal.
        const pullGroupField: Record<string, unknown> = {
          $pull: { 'groups.$[g].fields': field._id },
        };
        await tablesCol.updateOne({ _id: tableWithGroup._id }, pullGroupField, {
          arrayFilters: [{ 'g.fields': field._id }],
        });
        await tablesCol.updateOne(
          { _id: tableWithGroup._id },
          { $unset: { [`_schema.${field.slug}`]: '' } },
        );
      }

      logger.item(
        `campo ${field.slug} quarentenado (definition quebrada ${definition._id})`,
      );
      cleanedFields++;
    }

    await linksCol.deleteMany({ relationshipId: definition._id });
    await defsCol.deleteOne({ _id: definition._id });

    logger.item(`definition ${definition._id} deletada (tabela ausente)`);
    cleanedDefinitions++;
  }

  return { definitions: cleanedDefinitions, fields: cleanedFields };
}

await runMigration({
  title: TITLE,
  marker: 'MIGRATION_RELATIONSHIP_BROKEN_DEFINITIONS_AT',
  async run({ db, logger }): Promise<string> {
    const result = await cleanupBrokenDefinitions(db, logger);

    return `${result.definitions} definitions quebradas removidas, ${result.fields} campos quarentenados`;
  },
});
