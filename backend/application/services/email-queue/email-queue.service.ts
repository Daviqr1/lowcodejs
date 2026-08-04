import { Queue } from 'bullmq';
import { Service } from 'fastify-decorators';

import { RedisContractService } from '@application/services/redis/redis-contract.service';

import {
  EMAIL_JOB,
  EMAIL_QUEUE_NAME,
  EmailQueueContractService,
  type EmailJobPayload,
} from './email-queue-contract.service';

@Service()
export default class BullMQEmailQueueService implements EmailQueueContractService {
  constructor(private readonly redis: RedisContractService) {}

  // Fila preguicosa: so abre conexao quando algo e realmente enfileirado.
  private cachedQueue: Queue | null = null;

  private getQueue(): Queue {
    if (this.cachedQueue) return this.cachedQueue;
    this.cachedQueue = new Queue(EMAIL_QUEUE_NAME, {
      connection: this.redis.createQueueConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    });
    return this.cachedQueue;
  }

  async enqueue(payload: EmailJobPayload): Promise<string> {
    const queue = this.getQueue();
    const jobId = `${EMAIL_JOB.SEND}:${Date.now()}:${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    const job = await queue.add(EMAIL_JOB.SEND, payload, { jobId });
    return job.id ?? jobId;
  }

  async close(): Promise<void> {
    if (this.cachedQueue) {
      await this.cachedQueue.close();
      this.cachedQueue = null;
    }
  }
}
