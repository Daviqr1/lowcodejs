import { Queue } from 'bullmq';
import { Service } from 'fastify-decorators';

import { createBullMQConnection } from '@config/redis.config';

import {
  CSV_IMPORT_JOB,
  CSV_IMPORT_QUEUE_NAME,
  CsvImportQueueContractService,
  type CsvImportJobPayload,
} from './csv-import-queue-contract.service';

let cachedQueue: Queue | null = null;

function getQueue(): Queue {
  if (cachedQueue) return cachedQueue;
  cachedQueue = new Queue(CSV_IMPORT_QUEUE_NAME, {
    connection: createBullMQConnection(),
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 50 },
    },
  });
  return cachedQueue;
}

@Service()
export default class BullMQCsvImportQueueService implements CsvImportQueueContractService {
  async enqueue(payload: CsvImportJobPayload): Promise<string> {
    const queue = getQueue();
    const jobId = `${CSV_IMPORT_JOB.IMPORT}:${Date.now()}:${Math.random()
      .toString(16)
      .slice(2, 10)}`;
    const job = await queue.add(CSV_IMPORT_JOB.IMPORT, payload, { jobId });
    return job.id ?? jobId;
  }

  async close(): Promise<void> {
    if (cachedQueue) {
      await cachedQueue.close();
      cachedQueue = null;
    }
  }
}
