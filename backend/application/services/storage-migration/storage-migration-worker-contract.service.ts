import type { Worker } from 'bullmq';

/**
 * Worker BullMQ da migracao de arquivos entre drivers de storage. Copia em
 * lotes, emite progresso pelo namespace `/storage-migration` e trata o job de
 * cleanup do driver antigo.
 */
export abstract class StorageMigrationWorkerContractService {
  /** Idempotente: chamadas repetidas devolvem o mesmo worker. */
  abstract start(): Worker;
  abstract stop(): Promise<void>;
}
