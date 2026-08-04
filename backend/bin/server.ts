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
import { StorageMigrationSocketContractService } from '@application/services/storage-migration/storage-migration-socket-contract.service';
import StorageMigrationSocketService from '@application/services/storage-migration/storage-migration-socket.service';
import { EmailWorkerContractService } from '@application/services/email-queue/email-worker-contract.service';
import EmailWorkerService from '@application/services/email-queue/email-worker.service';
import { bootstrapSchedules } from '@application/services/scheduler/scheduler.bootstrap';
import type { SchedulerOrchestrator } from '@application/services/scheduler/scheduler.orchestrator';
import { StorageMigrationWorkerContractService } from '@application/services/storage-migration/storage-migration-worker-contract.service';
import StorageMigrationWorkerService from '@application/services/storage-migration/storage-migration-worker.service';
import { CsvImportSocketContractService } from '@application/services/csv-import/csv-import-socket-contract.service';
import CsvImportSocketService from '@application/services/csv-import/csv-import-socket.service';
import { ImportTableSocketContractService } from '@extensions/core/tools/tables-import-export/import-table-socket-contract.service';
import ImportTableSocketService from '@extensions/core/tools/tables-import-export/import-table-socket.service';
import { CsvImportWorkerContractService } from '@application/services/csv-import/csv-import-worker-contract.service';
import CsvImportWorkerService from '@application/services/csv-import/csv-import-worker.service';
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

    getInstanceByToken<StorageMigrationSocketContractService>(
      StorageMigrationSocketService,
    ).init(io, jwtDecode);
    console.info('Socket.IO storage-migration namespace initialized');

    getInstanceByToken<NotificationSocketContractService>(
      NotificationSocketService,
    ).init(io, jwtDecode);
    console.info('Socket.IO notifications namespace initialized');

    getInstanceByToken<ImportTableSocketContractService>(
      ImportTableSocketService,
    ).init(io, jwtDecode);
    console.info('Socket.IO table-import namespace initialized');

    await sweepStaleMigrations();

    getInstanceByToken<StorageMigrationWorkerContractService>(
      StorageMigrationWorkerService,
    ).start();
    console.info('Storage migration worker started');

    getInstanceByToken<EmailWorkerContractService>(EmailWorkerService).start();
    console.info('Email worker started');

    getInstanceByToken<CsvImportSocketContractService>(
      CsvImportSocketService,
    ).init(io, jwtDecode);
    console.info('Socket.IO csv-import namespace initialized');

    getInstanceByToken<CsvImportWorkerContractService>(
      CsvImportWorkerService,
    ).start();
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
