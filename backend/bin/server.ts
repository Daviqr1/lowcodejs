import { getInstanceByToken } from 'fastify-decorators';
import type { Server as HttpServer } from 'node:http';

import type { IJWTPayload } from '@application/core/entity.core';
import { loadExtensions } from '@application/core/extensions/loader';
import { Setting } from '@application/model/setting.model';
import { ExtensionContractRepository } from '@application/repositories/extension/extension-contract.repository';
import ExtensionMongooseRepository from '@application/repositories/extension/extension-mongoose.repository';
import { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import FieldMongooseRepository from '@application/repositories/field/field-mongoose.repository';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import RowMongooseRepository from '@application/repositories/row/row-mongoose.repository';
import { StorageContractRepository } from '@application/repositories/storage/storage-contract.repository';
import StorageMongooseRepository from '@application/repositories/storage/storage-mongoose.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import TableMongooseRepository from '@application/repositories/table/table-mongoose.repository';
import { initChatSocket } from '@application/resources/chat/chat.socket';
import { initStorageMigrationSocket } from '@application/resources/storage-migration/storage-migration.socket';
import StorageService from '@application/services/storage/storage.service';
import { startStorageMigrationWorker } from '@application/services/storage-migration/worker';
import { TableSchemaContractService } from '@application/services/table-schema/table-schema-contract.service';
import TableSchemaMongooseService from '@application/services/table-schema/table-schema-mongoose.service';
import { MongooseConnect } from '@config/database.config';
import { syncStorageEnv } from '@config/setting-env-sync';
import { Env } from '@start/env';
import { kernel } from '@start/kernel';

import { injectRowAccessGuardDeps } from '../extensions/core/plugins/row-access/guard';

const SETTING_SYNC_KEYS = [
  'SYSTEM_NAME',
  'LOCALE',
  'FILE_UPLOAD_MAX_SIZE',
  'FILE_UPLOAD_ACCEPTED',
  'FILE_UPLOAD_MAX_FILES_PER_UPLOAD',
  'PAGINATION_PER_PAGE',
  'EMAIL_PROVIDER_HOST',
  'EMAIL_PROVIDER_PORT',
  'EMAIL_PROVIDER_USER',
  'EMAIL_PROVIDER_PASSWORD',
  'LOGO_SMALL_URL',
  'LOGO_LARGE_URL',
  'OPENAI_API_KEY',
  'AI_ASSISTANT_ENABLED',
];

async function loadStorageConfig(): Promise<void> {
  const setting = await Setting.findOne().lean();

  if (setting) {
    syncStorageEnv(setting as never);
    console.info(`[Storage] Driver: ${setting.STORAGE_DRIVER ?? 'local'}`);
  } else {
    console.info('[Storage] Nenhum Setting encontrado, usando driver local');
  }
}

async function syncSettingsFromDatabase(): Promise<void> {
  const settings = await Setting.findOne().lean();
  if (!settings) return;

  for (const key of SETTING_SYNC_KEYS) {
    const value = (settings as Record<string, unknown>)[key];
    if (value !== undefined && value !== null) {
      process.env[key] = String(value);
    }
  }
  console.info('Settings synced from database');
}

async function sweepStaleMigrations(): Promise<void> {
  const repo = getInstanceByToken<StorageContractRepository>(
    StorageMongooseRepository,
  );
  const swept = await repo.markInProgressAsFailed();
  if (swept > 0) {
    console.info(
      `[StorageMigration] Sweep boot: ${swept} arquivo(s) órfão(s) em 'in_progress' marcados como 'failed'.`,
    );
  }
}

async function loadExtensionsRegistry(): Promise<void> {
  try {
    const repo = getInstanceByToken<ExtensionContractRepository>(
      ExtensionMongooseRepository,
    );
    await loadExtensions(repo);
  } catch (error) {
    console.error('[Extensions] Falha ao carregar registry:', error);
  }
}

function injectExtensionGuardsDeps(): void {
  const fieldRepo = getInstanceByToken<FieldContractRepository>(
    FieldMongooseRepository,
  );
  const tableRepo = getInstanceByToken<TableContractRepository>(
    TableMongooseRepository,
  );
  const rowRepo = getInstanceByToken<RowContractRepository>(
    RowMongooseRepository,
  );
  const tableSchemaService = getInstanceByToken<TableSchemaContractService>(
    TableSchemaMongooseService,
  );

  injectRowAccessGuardDeps({
    fieldRepo,
    tableRepo,
    rowRepo,
    tableSchemaService,
  });
}

async function start(): Promise<void> {
  try {
    await loadStorageConfig();
    await kernel.ready();

    await kernel.listen({ port: Env.PORT, host: '0.0.0.0' });
    console.info(`HTTP Server running on http://localhost:${Env.PORT}`);

    const httpServer = kernel.server as HttpServer;
    const jwtDecode = (token: string): IJWTPayload | null =>
      kernel.jwt.decode<IJWTPayload>(token);

    const io = initChatSocket(httpServer, jwtDecode);
    console.info('Socket.IO chat initialized');

    const migrationNamespace = initStorageMigrationSocket(io, jwtDecode);
    console.info('Socket.IO storage-migration namespace initialized');

    await sweepStaleMigrations();
    await loadExtensionsRegistry();
    injectExtensionGuardsDeps();

    const storageRepository = getInstanceByToken<StorageContractRepository>(
      StorageMongooseRepository,
    );
    const storageService = getInstanceByToken<StorageService>(StorageService);

    startStorageMigrationWorker({
      namespace: migrationNamespace,
      storageRepository,
      storageService,
    });
    console.info('Storage migration worker started');
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

MongooseConnect().then(async () => {
  console.info('Mongoose system connected:', Env.DB_DATABASE);
  console.info('Mongoose data connected:', Env.DB_DATA_DATABASE);
  await syncSettingsFromDatabase();
  start();
});
