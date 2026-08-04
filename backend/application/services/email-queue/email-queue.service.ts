import { Queue } from 'bullmq';
import { Service } from 'fastify-decorators';

import { QueueBase } from '@application/services/queue-worker/queue.base';
import { RedisContractService } from '@application/services/redis/redis-contract.service';

import {
  EMAIL_JOB,
  EMAIL_QUEUE_NAME,
  EmailQueueContractService,
  type EmailJobPayload,
} from './email-queue-contract.service';

@Service()
export default class BullMQEmailQueueService
  extends QueueBase
  implements EmailQueueContractService
{
  constructor(private readonly redis: RedisContractService) {
    super();
  }

  protected createQueue(): Queue {
    return new Queue(EMAIL_QUEUE_NAME, {
      connection: this.redis.createQueueConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    });
  }

  async enqueue(payload: EmailJobPayload): Promise<string> {
    const jobId = this.buildJobId(EMAIL_JOB.SEND);
    const job = await this.getQueue().add(EMAIL_JOB.SEND, payload, { jobId });
    return job.id ?? jobId;
  }
}
