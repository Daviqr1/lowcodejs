import type { Worker } from 'bullmq';

import type { CsvImportJobPayload } from './csv-import-queue-contract.service';

/**
 * Worker BullMQ do import de CSV. Le o arquivo, coage cada celula pelo tipo do
 * campo, cria as rows e emite progresso pelo namespace `/csv-import`.
 */
export abstract class CsvImportWorkerContractService {
  /** Idempotente: chamadas repetidas devolvem o mesmo worker. */
  abstract start(): Worker<CsvImportJobPayload>;
  abstract stop(): Promise<void>;
}
