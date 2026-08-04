import { Service } from 'fastify-decorators';

import type { JobProgress } from './generate-test-data.types';
import { GenerationJobRegistryContractService } from './generation-job-registry-contract.service';

@Service()
export default class GenerationJobRegistryService implements GenerationJobRegistryContractService {
  private readonly jobs = new Map<string, JobProgress>();

  setJob(jobId: string, data: JobProgress): void {
    this.jobs.set(jobId, data);
  }

  getJob(jobId: string): JobProgress | undefined {
    return this.jobs.get(jobId);
  }

  updateProgress(
    jobId: string,
    processed: number,
    status: JobProgress['status'] = 'processing',
  ): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.processed = processed;
    job.status = status;
  }

  completeJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.processed = job.total;
    job.status = 'completed';
  }

  failJob(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'failed';
    job.error = error;
  }
}
