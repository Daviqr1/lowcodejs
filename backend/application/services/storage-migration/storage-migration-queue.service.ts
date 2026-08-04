import { Queue } from 'bullmq';
import { Service } from 'fastify-decorators';

import { RedisContractService } from '@application/services/redis/redis-contract.service';

import {
  STORAGE_MIGRATION_JOB,
  STORAGE_MIGRATION_QUEUE_NAME,
  StorageMigrationQueueContractService,
  type ActiveJobInfo,
  type CleanupJobPayload,
  type MigrateJobPayload,
} from './storage-migration-queue-contract.service';

@Service()
export default class BullMQStorageMigrationQueueService implements StorageMigrationQueueContractService {
  constructor(private readonly redis: RedisContractService) {}

  // Fila preguicosa: so abre conexao quando algo e realmente enfileirado.
  private cachedQueue: Queue | null = null;

  private getQueue(): Queue {
    if (this.cachedQueue) return this.cachedQueue;
    this.cachedQueue = new Queue(STORAGE_MIGRATION_QUEUE_NAME, {
      connection: this.redis.createQueueConnection(),
      defaultJobOptions: {
        attempts: 1, // we manage retries inside the worker per file
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 50 },
      },
    });
    return this.cachedQueue;
  }

  async enqueueMigration(payload: MigrateJobPayload): Promise<string> {
    const queue = this.getQueue();
    const jobId = `${STORAGE_MIGRATION_JOB.MIGRATE}:${Date.now()}`;
    const job = await queue.add(STORAGE_MIGRATION_JOB.MIGRATE, payload, {
      jobId,
    });
    return job.id ?? jobId;
  }

  async enqueueCleanup(payload: CleanupJobPayload): Promise<string> {
    const queue = this.getQueue();
    const jobId = `${STORAGE_MIGRATION_JOB.CLEANUP}:${Date.now()}`;
    const job = await queue.add(STORAGE_MIGRATION_JOB.CLEANUP, payload, {
      jobId,
    });
    return job.id ?? jobId;
  }

  async getActiveJob(): Promise<ActiveJobInfo | null> {
    const queue = this.getQueue();
    const jobs = await queue.getJobs(['active', 'waiting', 'delayed']);
    if (jobs.length === 0) return null;
    const job = jobs[0];
    // BullMQ getState() retorna um union mais amplo (waiting-children,
    // prioritized) do que ActiveJobInfo['state']; estreita por checagem.
    const rawState = await job.getState();
    let state: ActiveJobInfo['state'] = 'unknown';
    if (
      rawState === 'waiting' ||
      rawState === 'active' ||
      rawState === 'delayed' ||
      rawState === 'completed' ||
      rawState === 'failed'
    ) {
      state = rawState;
    }
    let name: ActiveJobInfo['name'] = 'migrate';
    if (job.name === 'cleanup') name = 'cleanup';
    let progress = 0;
    if (typeof job.progress === 'number') progress = job.progress;
    return {
      id: job.id ?? '',
      name,
      state,
      progress,
    };
  }

  async close(): Promise<void> {
    if (this.cachedQueue) {
      await this.cachedQueue.close();
      this.cachedQueue = null;
    }
  }
}
