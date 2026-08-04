import type { Merge } from '@application/core/entity.core';
import { InMemoryRepository } from '@application/repositories/in-memory-base.repository';

import {
  CsvImportQueueContractService,
  type CsvImportJobPayload,
} from './csv-import-queue-contract.service';

type StoredJob = Merge<CsvImportJobPayload, { id: string; enqueuedAt: Date }>;

export default class InMemoryCsvImportQueueService
  extends InMemoryRepository
  implements CsvImportQueueContractService
{
  private jobs: StoredJob[] = [];
  private counter = 0;

  async enqueue(payload: CsvImportJobPayload): Promise<string> {
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
