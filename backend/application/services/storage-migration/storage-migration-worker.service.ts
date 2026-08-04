/**
 * BullMQ Worker for storage migration / cleanup jobs.
 *
 * The worker runs in-process alongside the API. It consumes jobs from the
 * `storage-migration` queue and emits real-time progress to the
 * `/storage-migration` Socket.IO namespace.
 *
 * Per-file state machine for migration jobs:
 *   1. Skip if doc.location === target_driver (idempotent)
 *   2. Mark migration_status = 'in_progress'
 *   3. Try up to 3 times: read source -> writeRaw target -> verify size
 *   4. Success: updateLocation(target, 'idle') + emit file_migrated
 *      Failure: updateLocation(source, 'failed') + emit file_failed
 *
 * For cleanup jobs:
 *   - Delete each file_id from the opposite driver and emit progress.
 */
import { Worker, type Job } from 'bullmq';
import { Service } from 'fastify-decorators';
import type { Readable } from 'node:stream';
import type { Namespace } from 'socket.io';

import {
  E_STORAGE_MIGRATION_STATUS,
  type TStorageLocation,
} from '@application/core/entity.core';
import type { StorageContractRepository } from '@application/repositories/storage/storage-contract.repository';
import { RedisContractService } from '@application/services/redis/redis-contract.service';
import StorageService from '@application/services/storage/storage.service';
import { StorageConfigContractService } from '@application/services/storage-config/storage-config-contract.service';
// A fachada e a unica que sabe despachar por driver (`forDriver`), e a
// migracao precisa ler de um driver e escrever no outro.

import {
  STORAGE_MIGRATION_JOB,
  STORAGE_MIGRATION_QUEUE_NAME,
  type CleanupJobPayload,
  type MigrateJobPayload,
} from './storage-migration-queue-contract.service';
import { StorageMigrationSocketContractService } from './storage-migration-socket-contract.service';
import {
  STORAGE_MIGRATION_EVENT,
  type StorageMigrationCompletedEvent,
  type StorageMigrationFileFailedEvent,
  type StorageMigrationFileMigratedEvent,
  type StorageMigrationProgressEvent,
} from './storage-migration-socket-contract.service';
import { StorageMigrationWorkerContractService } from './storage-migration-worker-contract.service';

const RETRY_LIMIT = 3;

type WorkerDeps = {
  namespace: Namespace;
  storageRepository: StorageContractRepository;
  storageService: StorageService;
  storageConfig: StorageConfigContractService;
};

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    let buf: Buffer = chunk;
    if (typeof chunk === 'string') buf = Buffer.from(chunk);
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processInBatches<T>(
  items: T[],
  concurrency: number,

  handler: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let index = 0;
  const slots = Math.max(1, Math.min(concurrency, items.length));
  const workers: Promise<void>[] = [];

  for (let i = 0; i < slots; i++) {
    workers.push(
      (async (): Promise<void> => {
        while (true) {
          const current = index++;
          if (current >= items.length) return;
          await handler(items[current], current);
        }
      })(),
    );
  }

  await Promise.all(workers);
}

// `processed` conta tudo que saiu da fila (inclusive doc inexistente e doc ja
// no driver de destino). `succeeded` conta so o que foi realmente copiado —
// antes o evento `completed` fazia `processed - failed` e reportava os pulados
// como sucesso.
type JobProgressContext = {
  processed: number;
  succeeded: number;
  failed: number;
  total: number;
  startedAt: number;
};

async function migrateOneFile(
  fileId: string,
  source: TStorageLocation,
  target: TStorageLocation,
  deps: WorkerDeps,
  jobId: string,
  ctx: JobProgressContext,
): Promise<void> {
  const { storageRepository, storageService, namespace } = deps;

  const doc = await storageRepository.findById(fileId);
  if (!doc) {
    ctx.processed++;
    return;
  }
  if (doc.location === target) {
    ctx.processed++;
    return;
  }

  await storageRepository.updateLocation(
    fileId,
    source,
    E_STORAGE_MIGRATION_STATUS.IN_PROGRESS,
  );

  let attempts = 0;
  let lastError: Error | null = null;

  while (attempts < RETRY_LIMIT) {
    attempts++;
    try {
      const sourceImpl = storageService.forDriver(source);
      const targetImpl = storageService.forDriver(target);

      const reader = await sourceImpl.read(doc.filename);
      const buffer = await streamToBuffer(reader.stream);
      const written = await targetImpl.writeRaw(
        doc.filename,
        buffer,
        doc.mimetype,
      );

      if (written.size !== doc.size) {
        // best-effort delete of the bad copy
        try {
          await targetImpl.delete(doc.filename);
        } catch {
          // ignore
        }
        throw new Error(
          `SIZE_MISMATCH: expected ${doc.size}, got ${written.size}`,
        );
      }

      await storageRepository.updateLocation(
        fileId,
        target,
        E_STORAGE_MIGRATION_STATUS.IDLE,
      );
      deps.storageConfig.invalidateMeta(doc.filename);

      ctx.processed++;
      ctx.succeeded++;

      const migratedEvt: StorageMigrationFileMigratedEvent = {
        _id: doc._id,
        filename: doc.filename,
        from: source,
        to: target,
      };
      namespace.emit(STORAGE_MIGRATION_EVENT.FILE_MIGRATED, migratedEvt);
      emitProgress(namespace, jobId, doc.filename, ctx);
      return;
    } catch (err) {
      lastError = new Error(String(err));
      if (err instanceof Error) lastError = err;
      if (attempts < RETRY_LIMIT) {
        await sleep(1000 * attempts);
      }
    }
  }

  await storageRepository.updateLocation(
    fileId,
    source,
    E_STORAGE_MIGRATION_STATUS.FAILED,
  );
  deps.storageConfig.invalidateMeta(doc.filename);
  ctx.failed++;
  ctx.processed++;

  const failedEvt: StorageMigrationFileFailedEvent = {
    _id: doc._id,
    filename: doc.filename,
    error: lastError?.message ?? 'Unknown error',
    attempts,
  };
  namespace.emit(STORAGE_MIGRATION_EVENT.FILE_FAILED, failedEvt);
  emitProgress(namespace, jobId, doc.filename, ctx);
}

function emitProgress(
  namespace: Namespace,
  jobId: string,
  currentFilename: string | null,
  ctx: JobProgressContext,
): void {
  const elapsedMs = Date.now() - ctx.startedAt;
  const remaining = ctx.total - ctx.processed;
  let eta_seconds: number | null = null;
  if (ctx.processed > 0) {
    eta_seconds = Math.round(((elapsedMs / ctx.processed) * remaining) / 1000);
  }

  const evt: StorageMigrationProgressEvent = {
    job_id: jobId,
    processed: ctx.processed,
    total: ctx.total,
    current_filename: currentFilename,
    failed_count: ctx.failed,
    eta_seconds,
  };
  namespace.emit(STORAGE_MIGRATION_EVENT.PROGRESS, evt);
}

async function handleMigrate(
  job: Job<MigrateJobPayload>,
  deps: WorkerDeps,
): Promise<void> {
  const { source_driver, target_driver, file_ids, concurrency } = job.data;
  const jobId = job.id ?? 'unknown';
  const ctx: JobProgressContext = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    total: file_ids.length,
    startedAt: Date.now(),
  };

  console.info(
    `[StorageMigration Worker] migrate ${jobId}: ${file_ids.length} files ${source_driver} -> ${target_driver} (concurrency=${concurrency})`,
  );

  await processInBatches(file_ids, concurrency, async (fileId) => {
    await migrateOneFile(
      fileId,
      source_driver,
      target_driver,
      deps,
      jobId,
      ctx,
    );
    let progress = 100;
    if (ctx.total !== 0) {
      progress = Math.round((ctx.processed / ctx.total) * 100);
    }
    await job.updateProgress(progress);
  });

  const completedEvt: StorageMigrationCompletedEvent = {
    job_id: jobId,
    total: ctx.total,
    succeeded: ctx.succeeded,
    failed: ctx.failed,
    duration_ms: Date.now() - ctx.startedAt,
  };
  deps.namespace.emit(STORAGE_MIGRATION_EVENT.COMPLETED, completedEvt);
}

async function handleCleanup(
  job: Job<CleanupJobPayload>,
  deps: WorkerDeps,
): Promise<void> {
  const { driver_to_clear, file_ids } = job.data;
  const jobId = job.id ?? 'unknown';
  const impl = deps.storageService.forDriver(driver_to_clear);
  const ctx: JobProgressContext = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    total: file_ids.length,
    startedAt: Date.now(),
  };

  console.info(
    `[StorageMigration Worker] cleanup ${jobId}: deleting ${file_ids.length} files from ${driver_to_clear}`,
  );

  for (const fileId of file_ids) {
    const doc = await deps.storageRepository.findById(fileId);
    if (!doc) {
      ctx.processed++;
      continue;
    }
    try {
      await impl.delete(doc.filename);
      ctx.succeeded++;
    } catch (err) {
      let msg = String(err);
      if (err instanceof Error) msg = err.message;
      console.warn(
        `[StorageMigration Worker] cleanup falhou ${doc.filename}: ${msg}`,
      );
      ctx.failed++;
    }
    ctx.processed++;
    emitProgress(deps.namespace, jobId, doc.filename, ctx);
    let progress = 100;
    if (ctx.total !== 0) {
      progress = Math.round((ctx.processed / ctx.total) * 100);
    }
    await job.updateProgress(progress);
  }

  const completedEvt: StorageMigrationCompletedEvent = {
    job_id: jobId,
    total: ctx.total,
    succeeded: ctx.succeeded,
    failed: ctx.failed,
    duration_ms: Date.now() - ctx.startedAt,
  };
  deps.namespace.emit(STORAGE_MIGRATION_EVENT.COMPLETED, completedEvt);
}

// BullMQ entrega `Job` genérico; `job.name` discrimina o payload. Type-guards
// estreitam sem asserção.
function isMigrateJob(job: Job): job is Job<MigrateJobPayload> {
  return job.name === STORAGE_MIGRATION_JOB.MIGRATE;
}
function isCleanupJob(job: Job): job is Job<CleanupJobPayload> {
  return job.name === STORAGE_MIGRATION_JOB.CLEANUP;
}

@Service()
export default class StorageMigrationWorkerService implements StorageMigrationWorkerContractService {
  private worker: Worker | null = null;

  constructor(
    private readonly storageRepository: StorageContractRepository,
    private readonly storageService: StorageService,
    private readonly storageConfig: StorageConfigContractService,
    private readonly socket: StorageMigrationSocketContractService,
    private readonly redis: RedisContractService,
  ) {}

  start(): Worker {
    if (this.worker) return this.worker;

    const worker = new Worker(
      STORAGE_MIGRATION_QUEUE_NAME,
      async (job: Job) => {
        try {
          if (isMigrateJob(job)) {
            await handleMigrate(job, this.deps());
          } else if (isCleanupJob(job)) {
            await handleCleanup(job, this.deps());
          } else {
            console.warn(
              `[StorageMigration Worker] Job desconhecido: ${job.name}`,
            );
          }
        } catch (err) {
          console.error(
            `[StorageMigration Worker] Erro no job ${job.id}:`,
            err,
          );
          let message = String(err);
          if (err instanceof Error) message = err.message;
          this.deps().namespace.emit(STORAGE_MIGRATION_EVENT.ERROR, {
            job_id: job.id ?? 'unknown',
            message,
          });
          throw err;
        }
      },
      {
        connection: this.redis.createQueueConnection(),
        // BullMQ-level concurrency: process up to N jobs in parallel.
        // Per-file concurrency is handled inside each job via processInBatches.
        concurrency: 1,
      },
    );

    worker.on('failed', (job: Job | undefined, err: Error) => {
      console.error(
        `[StorageMigration Worker] Job ${job?.id} falhou:`,
        err.message,
      );
    });

    this.worker = worker;
    return worker;
  }

  async stop(): Promise<void> {
    if (!this.worker) return;
    await this.worker.close();
    this.worker = null;
  }

  /**
   * O namespace so existe depois que o socket subiu (`bin/server.ts`); por isso
   * as deps sao montadas por chamada, nao no constructor.
   */
  private deps(): WorkerDeps {
    const namespace = this.socket.namespace();
    if (!namespace) {
      throw new Error(
        '[StorageMigration Worker] namespace /storage-migration nao inicializado',
      );
    }

    return {
      namespace,
      storageRepository: this.storageRepository,
      storageService: this.storageService,
      storageConfig: this.storageConfig,
    };
  }
}
