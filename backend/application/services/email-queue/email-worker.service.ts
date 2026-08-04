import { Worker, type Job } from 'bullmq';
import { Service } from 'fastify-decorators';

import { EmailContractService } from '@application/services/email/email-contract.service';
import { QueueWorkerBase } from '@application/services/queue-worker/queue-worker.base';
import { RedisContractService } from '@application/services/redis/redis-contract.service';
import { Env } from '@start/env';

import {
  EMAIL_JOB,
  EMAIL_QUEUE_NAME,
  type EmailJobPayload,
} from './email-queue-contract.service';
import { EmailWorkerContractService } from './email-worker-contract.service';

@Service()
export default class EmailWorkerService
  extends QueueWorkerBase<EmailJobPayload>
  implements EmailWorkerContractService
{
  constructor(
    private readonly emailService: EmailContractService,
    private readonly redis: RedisContractService,
  ) {
    super();
  }

  protected createWorker(): Worker<EmailJobPayload> {
    const worker = new Worker<EmailJobPayload>(
      EMAIL_QUEUE_NAME,
      async (job) => {
        if (job.name === EMAIL_JOB.SEND) {
          await this.processSendJob(job);
          return;
        }
        console.warn(`[EmailWorker] Job desconhecido: ${job.name}`);
      },
      {
        connection: this.redis.createQueueConnection(),
        concurrency: Env.EMAIL_WORKER_CONCURRENCY,
      },
    );

    worker.on('completed', (job: Job<EmailJobPayload>): void => {
      console.info(`[EmailWorker] Job ${job.id} processado`);
    });

    worker.on(
      'failed',
      (job: Job<EmailJobPayload> | undefined, error: Error): void => {
        console.error(
          `[EmailWorker] Job ${job?.id} falhou (tentativa ${job?.attemptsMade ?? '?'}):`,
          error.message,
        );
      },
    );

    return worker;
  }

  private async processSendJob(job: Job<EmailJobPayload>): Promise<void> {
    const { template, data, to, subject, from } = job.data;

    const body = await this.emailService.buildTemplate({ template, data });
    const result = await this.emailService.sendEmail({
      to,
      subject,
      body,
      from,
    });

    if (!result.success) {
      throw new Error(
        `[EmailWorker] Falha ao enviar email: ${result.message ?? 'unknown error'}`,
      );
    }
  }
}
