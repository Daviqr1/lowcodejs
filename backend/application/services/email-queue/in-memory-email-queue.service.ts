import type { Merge } from '@application/core/entity.core';
import { InMemoryRepository } from '@application/repositories/in-memory-base.repository';

import {
  EmailQueueContractService,
  type EmailJobPayload,
} from './email-queue-contract.service';

type StoredJob = Merge<EmailJobPayload, { id: string; enqueuedAt: Date }>;

export default class InMemoryEmailQueueService
  extends InMemoryRepository
  implements EmailQueueContractService
{
  private jobs: StoredJob[] = [];
  private counter = 0;

  async enqueue(payload: EmailJobPayload): Promise<string> {
    this.checkError('enqueue');
    this.counter += 1;
    const id = `mem-${this.counter}`;
    this.jobs.push({ ...payload, id, enqueuedAt: new Date() });
    return id;
  }

  async close(): Promise<void> {
    this.jobs = [];
  }

  getJobs(): StoredJob[] {
    return [...this.jobs];
  }

  getLastJob(): StoredJob | undefined {
    return this.jobs[this.jobs.length - 1];
  }

  clear(): void {
    this.jobs = [];
  }
}
