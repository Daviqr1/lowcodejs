import { Queue } from 'bullmq';
import { Service } from 'fastify-decorators';

import { createBullMQConnection } from '@config/redis.config';

import {
  STORAGE_MIGRATION_JOB,
  STORAGE_MIGRATION_QUEUE_NAME,
  StorageMigrationQueueContractService,
  type ActiveJobInfo,
  type CleanupJobPayload,
  type MigrateJobPayload,
} from './storage-migration-queue-contract.service';

let cachedQueue: Queue | null = null;

function getQueue(): Queue {
  if (cachedQueue) return cachedQueue;
  cachedQueue = new Queue(STORAGE_MIGRATION_QUEUE_NAME, {
    connection: createBullMQConnection(),
    defaultJobOptions: {
      attempts: 1, // we manage retries inside the worker per file
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 50 },
    },
  });
  return cachedQueue;
}

@Service()
export default class BullMQStorageMigrationQueueService implements StorageMigrationQueueContractService {
  async enqueueMigration(payload: MigrateJobPayload): Promise<string> {
    const queue = getQueue();
    const jobId = `${STORAGE_MIGRATION_JOB.MIGRATE}:${Date.now()}`;
    const job = await queue.add(STORAGE_MIGRATION_JOB.MIGRATE, payload, {
      jobId,
    });
    return job.id ?? jobId;
  }

  async enqueueCleanup(payload: CleanupJobPayload): Promise<string> {
    const queue = getQueue();
    const jobId = `${STORAGE_MIGRATION_JOB.CLEANUP}:${Date.now()}`;
    const job = await queue.add(STORAGE_MIGRATION_JOB.CLEANUP, payload, {
      jobId,
    });
    return job.id ?? jobId;
  }

  async getActiveJob(): Promise<ActiveJobInfo | null> {
    const queue = getQueue();
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
    if (cachedQueue) {
      await cachedQueue.close();
      cachedQueue = null;
    }
  }
}
