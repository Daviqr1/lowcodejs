import type { JobProgress } from './generate-test-data.types';

/**
 * Progresso dos jobs de geracao, em memoria e no proprio processo. Antes era um
 * singleton manual (`private constructor` + `static getInstance()`), o que
 * escondia o estado do container e o tornava impossivel de isolar em teste.
 */
export abstract class GenerationJobRegistryContractService {
  abstract setJob(jobId: string, data: JobProgress): void;
  abstract getJob(jobId: string): JobProgress | undefined;
  abstract updateProgress(
    jobId: string,
    processed: number,
    status?: JobProgress['status'],
  ): void;
  abstract completeJob(jobId: string): void;
  abstract failJob(jobId: string, error: string): void;
}
