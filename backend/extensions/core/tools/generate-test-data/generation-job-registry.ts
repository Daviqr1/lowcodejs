import type { JobProgress } from './generate-test-data.types';

export class GenerationJobRegistry {
  private static instance: GenerationJobRegistry;
  private jobs = new Map<string, JobProgress>();

  private constructor() {}

  static getInstance(): GenerationJobRegistry {
    if (!GenerationJobRegistry.instance) {
      GenerationJobRegistry.instance = new GenerationJobRegistry();
    }
    return GenerationJobRegistry.instance;
  }

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
    if (job) {
      job.processed = processed;
      job.status = status;
      this.jobs.set(jobId, job);
    }
  }

  completeJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.processed = job.total;
      job.status = 'completed';
      this.jobs.set(jobId, job);
    }
  }

  failJob(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.error = error;
      this.jobs.set(jobId, job);
    }
  }
}
