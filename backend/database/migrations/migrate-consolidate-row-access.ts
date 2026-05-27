/**
 * Migration: consolida os 3 plugins antigos (visibility-by-role, creator-bypass,
 * date-window-guard) em um unico plugin (core:row-access).
 *
 * Para cada extension dos 3 antigos vinculada a alguma tabela:
 *  - Une os tableScope.tableIds das 3 numa lista de "tabelas afetadas"
 *  - Para cada tableId afetado, monta o novo RowAccessSettings combinando:
 *      - visibility: enabled=true se visibility-by-role estava ativo na tabela
 *      - creatorBypass: enabled=true se creator-bypass estava ativo na tabela
 *      - dateWindow: copia settings antigo do date-window-guard, ou {mode:'off'}
 *  - Upsert na extension (pkg='core', extensionId='row-access') com tableScope
 *    (uniao) + tableSettings (por tabela). enabled=true.
 *  - Desativa as 3 antigas (enabled=false). Loader marca available=false no boot
 *    quando os diretorios sumirem.
 *
 * NAO chama onTableBound da nova: assume que os fields ja foram criados pelas
 * antigas (visibility-by-role criou 'visibility', date-window-guard criou
 * valid_from/valid_until quando aplicavel). Defensiva: se nao criou, o
 * primeiro list query do MASTER vai notar e retornar 200 vazio — admin
 * configura via UI.
 *
 * Idempotente via marker MIGRATION_ROW_ACCESS_CONSOLIDATION_AT no Setting.
 *
 * Usage:
 *   npm run migrate:consolidate-row-access            # rodada normal
 *   npm run migrate:consolidate-row-access -- --force # ignora marker
 *
 * Environment variables required:
 *   DATABASE_URL     - MongoDB connection string
 *   DB_DATABASE      - System database name
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

config({ path: '.env' });

const DATABASE_URL = process.env.DATABASE_URL;
const DB_DATABASE = process.env.DB_DATABASE || 'lowcodejs';
const FORCE = process.argv.includes('--force');
const MARKER = 'MIGRATION_ROW_ACCESS_CONSOLIDATION_AT';

const OLD_KEYS = [
  { pkg: 'core', extensionId: 'visibility-by-role' },
  { pkg: 'core', extensionId: 'creator-bypass' },
  { pkg: 'core', extensionId: 'date-window-guard' },
] as const;

const NEW_PLUGIN = {
  pkg: 'core',
  type: 'PLUGIN',
  extensionId: 'row-access',
  name: 'Controle de Acesso a Linhas',
};

type SettingMarkerDoc = {
  _id: mongoose.Types.ObjectId;
  [MARKER]?: Date | null;
};

type TableScope = { mode: 'all' | 'specific'; tableIds: string[] };

type ExtensionDoc = {
  _id: mongoose.Types.ObjectId;
  pkg: string;
  type: string;
  extensionId: string;
  enabled?: boolean;
  available?: boolean;
  tableScope?: TableScope;
  tableSettings?: Record<string, Record<string, unknown>>;
  manifestSnapshot?: Record<string, unknown>;
};

function buildRowAccessSettings(
  hasVisibility: boolean,
  hasCreator: boolean,
  dateWindowOldSettings: Record<string, unknown> | undefined,
): Record<string, unknown> {
  // Visibility: se estava ativo, mantem compat com PUBLIC + SIGILOSO
  const visibility = hasVisibility
    ? {
        enabled: true,
        fieldSlug: 'visibility',
        values: ['PUBLIC', 'SIGILOSO'],
        roleMatrix: {
          PUBLIC: ['MASTER', 'ADMINISTRATOR', 'MANAGER', 'REGISTERED'],
          SIGILOSO: ['MASTER', 'ADMINISTRATOR'],
        },
        defaultValue: 'PUBLIC',
      }
    : {
        // Mesmo quando desativado, schema exige forma valida — Zod nao roda
        // pra disabled. Zeramos pra defaults seguros.
        enabled: false,
        fieldSlug: 'visibility',
        values: ['PUBLIC', 'SIGILOSO'],
        roleMatrix: {
          PUBLIC: ['MASTER', 'ADMINISTRATOR', 'MANAGER', 'REGISTERED'],
          SIGILOSO: ['MASTER', 'ADMINISTRATOR'],
        },
        defaultValue: 'PUBLIC',
      };

  // DateWindow: se settings antigos existirem, valida modo conhecido
  let dateWindow: Record<string, unknown> = { mode: 'off' };
  if (dateWindowOldSettings && typeof dateWindowOldSettings === 'object') {
    const mode = (dateWindowOldSettings as Record<string, unknown>).mode;
    if (
      mode === 'createdAt-sliding' ||
      mode === 'createdAt-fixed' ||
      mode === 'field-range'
    ) {
      dateWindow = dateWindowOldSettings;
    }
  }

  return {
    visibility,
    creatorBypass: { enabled: hasCreator },
    dateWindow,
  };
}

async function run(): Promise<void> {
  if (!DATABASE_URL) {
    console.error('[consolidate-row-access] DATABASE_URL is required');
    process.exit(1);
  }

  console.info(`[consolidate-row-access] System DB: ${DB_DATABASE}`);
  if (FORCE)
    console.info('[consolidate-row-access] Force: true (bypassing marker)');
  console.info('---');

  const conn = await mongoose
    .createConnection(DATABASE_URL, { dbName: DB_DATABASE })
    .asPromise();

  try {
    const settings = conn.collection<SettingMarkerDoc>('settings');
    const settingDoc = await settings.findOne<SettingMarkerDoc>({});

    if (!FORCE && settingDoc?.[MARKER]) {
      console.info(
        `[consolidate-row-access] Marker ja presente (${settingDoc[MARKER]!.toISOString()}), skip (use --force para re-executar).`,
      );
      return;
    }

    const extensions = conn.collection<ExtensionDoc>('extensions');

    // Carrega as 3 antigas
    const oldDocs = await extensions
      .find({
        $or: OLD_KEYS.map((k) => ({
          pkg: k.pkg,
          extensionId: k.extensionId,
        })),
      })
      .toArray();

    if (oldDocs.length === 0) {
      console.info(
        '[consolidate-row-access] Nenhuma extension antiga encontrada, nada a migrar.',
      );
      if (settingDoc) {
        await settings.updateOne(
          { _id: settingDoc._id },
          { $set: { [MARKER]: new Date() } },
        );
      }
      return;
    }

    const findOld = (extensionId: string): ExtensionDoc | undefined =>
      oldDocs.find((d) => d.extensionId === extensionId);

    const visExt = findOld('visibility-by-role');
    const creatorExt = findOld('creator-bypass');
    const dateExt = findOld('date-window-guard');

    // Coleta union de tableIds das 3 (apenas mode=specific)
    const tableIdsAffected = new Set<string>();
    const collectTableIds = (ext: ExtensionDoc | undefined): void => {
      if (!ext || !ext.enabled) return;
      if (ext.tableScope?.mode === 'specific') {
        for (const id of ext.tableScope.tableIds ?? []) {
          tableIdsAffected.add(id);
        }
      }
    };
    collectTableIds(visExt);
    collectTableIds(creatorExt);
    collectTableIds(dateExt);

    console.info(
      `[consolidate-row-access] ${oldDocs.length} extension(s) antiga(s) encontrada(s); ${tableIdsAffected.size} tabela(s) afetada(s).`,
    );

    if (tableIdsAffected.size === 0) {
      console.info(
        '[consolidate-row-access] Nenhuma tabela vinculada — apenas marca antigas como disabled e seta marker.',
      );
      for (const old of oldDocs) {
        await extensions.updateOne(
          { _id: old._id },
          { $set: { enabled: false, updatedAt: new Date() } },
        );
      }
      if (settingDoc) {
        await settings.updateOne(
          { _id: settingDoc._id },
          { $set: { [MARKER]: new Date() } },
        );
      }
      return;
    }

    // Determina por tabela quais plugins estavam ativos
    const tableInOld = (
      ext: ExtensionDoc | undefined,
      tableId: string,
    ): boolean => {
      if (!ext || !ext.enabled) return false;
      if (ext.tableScope?.mode !== 'specific') return false;
      return (ext.tableScope.tableIds ?? []).includes(tableId);
    };

    // Monta tableSettings consolidado
    const consolidatedTableSettings: Record<
      string,
      Record<string, unknown>
    > = {};
    for (const tableId of tableIdsAffected) {
      const hasVisibility = tableInOld(visExt, tableId);
      const hasCreator = tableInOld(creatorExt, tableId);
      const dateOldSettings = dateExt?.tableSettings?.[tableId];
      consolidatedTableSettings[tableId] = buildRowAccessSettings(
        hasVisibility,
        hasCreator,
        dateOldSettings,
      );
    }

    // Upsert da nova extension
    const tableIdsArray = Array.from(tableIdsAffected).sort();

    const existingNew = await extensions.findOne({
      pkg: NEW_PLUGIN.pkg,
      type: NEW_PLUGIN.type,
      extensionId: NEW_PLUGIN.extensionId,
    });

    if (existingNew) {
      // Merge: une tableIds + tableSettings
      const mergedTableIds = Array.from(
        new Set([
          ...(existingNew.tableScope?.tableIds ?? []),
          ...tableIdsArray,
        ]),
      ).sort();
      const mergedSettings = {
        ...(existingNew.tableSettings ?? {}),
        ...consolidatedTableSettings,
      };

      await extensions.updateOne(
        { _id: existingNew._id },
        {
          $set: {
            enabled: true,
            tableScope: { mode: 'specific', tableIds: mergedTableIds },
            tableSettings: mergedSettings,
            updatedAt: new Date(),
          },
        },
      );
      console.info(
        `[consolidate-row-access] Atualizado extension '${NEW_PLUGIN.extensionId}' existente (${mergedTableIds.length} tabela(s)).`,
      );
    } else {
      const now = new Date();
      // Insercao "parcial" — loader.upsert no proximo boot preenche name,
      // version, manifest snapshot, etc. Usamos `as never` pra escapar do
      // ExtensionDoc estrito.
      await extensions.insertOne({
        _id: new mongoose.Types.ObjectId(),
        pkg: NEW_PLUGIN.pkg,
        type: NEW_PLUGIN.type,
        extensionId: NEW_PLUGIN.extensionId,
        enabled: true,
        available: true,
        tableScope: { mode: 'specific', tableIds: tableIdsArray },
        tableSettings: consolidatedTableSettings,
        manifestSnapshot: { id: NEW_PLUGIN.extensionId },
        createdAt: now,
        updatedAt: now,
        trashed: false,
        trashedAt: null,
      } as never);
      console.info(
        `[consolidate-row-access] Criado extension '${NEW_PLUGIN.extensionId}' (${tableIdsArray.length} tabela(s)).`,
      );
    }

    // Desativa as 3 antigas
    for (const old of oldDocs) {
      await extensions.updateOne(
        { _id: old._id },
        { $set: { enabled: false, updatedAt: new Date() } },
      );
      console.info(
        `[consolidate-row-access] Desativada extension antiga: ${old.extensionId}`,
      );
    }

    // Seta marker
    if (settingDoc) {
      await settings.updateOne(
        { _id: settingDoc._id },
        { $set: { [MARKER]: new Date() } },
      );
      console.info(`[consolidate-row-access] Marker ${MARKER} registrado.`);
    }

    console.info('---');
    console.info('[consolidate-row-access] Consolidacao concluida.');
  } finally {
    await conn.close();
  }
}

run().catch((err: unknown) => {
  console.error('[consolidate-row-access] Erro fatal:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
