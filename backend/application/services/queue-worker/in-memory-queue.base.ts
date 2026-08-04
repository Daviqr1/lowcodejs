import type { Merge } from '@application/core/entity.core';
import { InMemoryRepository } from '@application/repositories/in-memory-base.repository';

/**
 * Base dos doubles de fila. `in-memory-email-queue` e `in-memory-csv-import-queue`
 * eram o mesmo arquivo de 50 linhas com um import diferente: mesmo array de
 * jobs, mesmo contador, mesmos `getJobs`/`getLastJob`/`clear`.
 *
 * Estende a `InMemoryRepository` pela simulacao de erro que os specs usam.
 */
export abstract class InMemoryQueueBase<TPayload> extends InMemoryRepository {
  private jobs: Array<Merge<TPayload, { id: string; enqueuedAt: Date }>> = [];
  private counter = 0;

  async enqueue(payload: TPayload): Promise<string> {
    this.checkError('enqueue');
    this.counter += 1;
    const id = `mem-${this.counter}`;
    this.jobs.push({ ...payload, id, enqueuedAt: new Date() });
    return id;
  }

  async close(): Promise<void> {
    this.jobs = [];
  }

  getJobs(): Array<Merge<TPayload, { id: string; enqueuedAt: Date }>> {
    return [...this.jobs];
  }

  getLastJob(): Merge<TPayload, { id: string; enqueuedAt: Date }> | undefined {
    return this.jobs[this.jobs.length - 1];
  }

  clear(): void {
    this.jobs = [];
  }
}
