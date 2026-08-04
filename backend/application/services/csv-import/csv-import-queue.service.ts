import { Queue } from 'bullmq';
import { Service } from 'fastify-decorators';

import { RedisContractService } from '@application/services/redis/redis-contract.service';

import {
  CSV_IMPORT_JOB,
  CSV_IMPORT_QUEUE_NAME,
  CsvImportQueueContractService,
  type CsvImportJobPayload,
} from './csv-import-queue-contract.service';

@Service()
export default class BullMQCsvImportQueueService implements CsvImportQueueContractService {
  constructor(private readonly redis: RedisContractService) {}

  // Fila preguicosa: so abre conexao quando algo e realmente enfileirado.
  private cachedQueue: Queue | null = null;

  private getQueue(): Queue {
    if (this.cachedQueue) return this.cachedQueue;
    this.cachedQueue = new Queue(CSV_IMPORT_QUEUE_NAME, {
      connection: this.redis.createQueueConnection(),
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 50 },
      },
    });
    return this.cachedQueue;
  }

  async enqueue(payload: CsvImportJobPayload): Promise<string> {
    const queue = this.getQueue();
    const jobId = `${CSV_IMPORT_JOB.IMPORT}:${Date.now()}:${Math.random()
      .toString(16)
      .slice(2, 10)}`;
    const job = await queue.add(CSV_IMPORT_JOB.IMPORT, payload, { jobId });
    return job.id ?? jobId;
  }

  async close(): Promise<void> {
    if (this.cachedQueue) {
      await this.cachedQueue.close();
      this.cachedQueue = null;
    }
  }
}
