import { Queue } from 'bullmq';
import { Service } from 'fastify-decorators';

import { QueueBase } from '@application/services/queue-worker/queue.base';
import { RedisContractService } from '@application/services/redis/redis-contract.service';

import {
  CSV_IMPORT_JOB,
  CSV_IMPORT_QUEUE_NAME,
  CsvImportQueueContractService,
  type CsvImportJobPayload,
} from './csv-import-queue-contract.service';

@Service()
export default class BullMQCsvImportQueueService
  extends QueueBase
  implements CsvImportQueueContractService
{
  constructor(private readonly redis: RedisContractService) {
    super();
  }

  protected createQueue(): Queue {
    return new Queue(CSV_IMPORT_QUEUE_NAME, {
      connection: this.redis.createQueueConnection(),
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 50 },
      },
    });
  }

  async enqueue(payload: CsvImportJobPayload): Promise<string> {
    const jobId = this.buildJobId(CSV_IMPORT_JOB.IMPORT);
    const job = await this.getQueue().add(CSV_IMPORT_JOB.IMPORT, payload, {
      jobId,
    });
    return job.id ?? jobId;
  }
}
