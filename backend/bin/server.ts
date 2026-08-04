/* eslint-disable import/order */
import 'reflect-metadata';

import { getInstanceByToken } from 'fastify-decorators';

import type { IJWTPayload } from '@application/core/entity.core';
import { Setting } from '@application/model/setting.model';
import { StorageContractRepository } from '@application/repositories/storage/storage-contract.repository';
import StorageMongooseRepository from '@application/repositories/storage/storage.repository';
import { initChatSocket } from '@application/resources/chat/chat.socket';
import { NotificationSocketContractService } from '@application/services/notification-socket/notification-socket-contract.service';
import NotificationSocketService from '@application/services/notification-socket/notification-socket.service';
import { initStorageMigrationSocket } from '@application/resources/storage-migration/storage-migration.socket';
import { EmailWorkerContractService } from '@application/services/email-queue/email-worker-contract.service';
import EmailWorkerService from '@application/services/email-queue/email-worker.service';
import { bootstrapSchedules } from '@application/services/scheduler/scheduler.bootstrap';
import type { SchedulerOrchestrator } from '@application/services/scheduler/scheduler.orchestrator';
import { startStorageMigrationWorker } from '@application/services/storage-migration/worker';
import { initCsvImportSocket } from '@application/resources/table-rows/import-csv/import-csv.socket';
import { initTableImportSocket } from '@extensions/core/tools/tables-import-export/import-table.socket';
import { startCsvImportWorker } from '@application/services/csv-import/worker';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import RowMongooseRepository from '@application/repositories/row/row.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import TableMongooseRepository from '@application/repositories/table/table.repository';
import { RowAccessGuardContractService } from '@application/services/row-access-guard/row-access-guard-contract.service';
import RowAccessGuardService from '@application/services/row-access-guard/row-access-guard.service';
import { RowPasswordContractService } from '@application/services/row-password/row-password-contract.service';
import BcryptRowPasswordService from '@application/services/row-password/row-password.service';
import StorageService from '@application/services/storage/storage.service';
import { MongooseConnect } from '@config/database.config';
import { SettingEnvSyncContractService } from '@application/services/setting-env-sync/setting-env-sync-contract.service';
import SettingEnvSyncService from '@application/services/setting-env-sync/setting-env-sync.service';
import { Env } from '@start/env';
import { kernel } from '@start/kernel';

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
    getInstanceByToken<SettingEnvSyncContractService>(
      SettingEnvSyncService,
    ).syncStorage(setting);
    console.info(`[Storage] Driver: ${setting.STORAGE_DRIVER ?? 'local'}`);
  } else {
    console.info('[Storage] Nenhum Setting encontrado, usando driver local');
  }
}

async function syncSettingsFromDatabase(): Promise<void> {
  const settings: Record<string, unknown> | null =
    await Setting.findOne().lean();
  if (!settings) return;

  for (const key of SETTING_SYNC_KEYS) {
    const value = settings[key];
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

async function start(): Promise<void> {
  try {
    await loadStorageConfig();

    // Agendamentos: o hook de limpeza precisa ser registrado ANTES do ready()
    // (Fastify trava addHook depois disso). O bootstrap em si roda após o ready()
    // e preenche o orchestrator lido pelo hook no shutdown.
    let schedulerOrchestrator: SchedulerOrchestrator | undefined = undefined;
    kernel.addHook('onClose', async () => {
      schedulerOrchestrator?.clearAll();
    });

    await kernel.ready();

    if (Env.SCHEDULER_ENABLED) {
      schedulerOrchestrator = bootstrapSchedules();
      console.info('Scheduler started');
    }

    await kernel.listen({ port: Env.PORT, host: '0.0.0.0' });
    console.info(`HTTP Server running on http://localhost:${Env.PORT}`);

    const httpServer = kernel.server;
    // Verifica assinatura RS256 + expiracao. `decode` apenas desserializa e
    // aceitaria token forjado; os namespaces confiam no `sub` retornado aqui.
    const jwtDecode = (token: string): IJWTPayload | null => {
      try {
        return kernel.jwt.verify<IJWTPayload>(token);
      } catch {
        return null;
      }
    };

    const io = initChatSocket(httpServer, jwtDecode);
    console.info('Socket.IO chat initialized');

    const migrationNamespace = initStorageMigrationSocket(io, jwtDecode);
    console.info('Socket.IO storage-migration namespace initialized');

    getInstanceByToken<NotificationSocketContractService>(
      NotificationSocketService,
    ).init(io, jwtDecode);
    console.info('Socket.IO notifications namespace initialized');

    initTableImportSocket(io, jwtDecode);
    console.info('Socket.IO table-import namespace initialized');

    await sweepStaleMigrations();

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

    getInstanceByToken<EmailWorkerContractService>(EmailWorkerService).start();
    console.info('Email worker started');

    const { namespace: csvImportNamespace, storeResult: csvImportStoreResult } =
      initCsvImportSocket(io, jwtDecode);
    console.info('Socket.IO csv-import namespace initialized');

    const csvTableRepository = getInstanceByToken<TableContractRepository>(
      TableMongooseRepository,
    );
    const csvRowRepository = getInstanceByToken<RowContractRepository>(
      RowMongooseRepository,
    );
    const csvRowPasswordService =
      getInstanceByToken<RowPasswordContractService>(BcryptRowPasswordService);
    const csvRowAccessGuard = getInstanceByToken<RowAccessGuardContractService>(
      RowAccessGuardService,
    );

    startCsvImportWorker({
      namespace: csvImportNamespace,
      storeResult: csvImportStoreResult,
      tableRepository: csvTableRepository,
      rowRepository: csvRowRepository,
      rowPasswordService: csvRowPasswordService,
      rowAccessGuard: csvRowAccessGuard,
    });
    console.info('CSV import worker started');

    // RowAccessGuard: deps e registro do guard fluem por DI (@Service +
    // di-registry). O RowAccessControlGuard recebe repos/builders por
    // constructor injection e o RowAccessGuardService o registra ao ser
    // instanciado — sem wiring manual aqui.
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
