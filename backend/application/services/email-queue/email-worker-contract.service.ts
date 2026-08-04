import type { Worker } from 'bullmq';

import type { EmailJobPayload } from './email-queue-contract.service';

/**
 * Worker BullMQ da fila de email. Renderiza o template e envia; se o envio
 * devolver `success: false`, lanca para forcar o retry (3 tentativas com
 * backoff exponencial).
 */
export abstract class EmailWorkerContractService {
  /** Idempotente: chamadas repetidas devolvem o mesmo worker. */
  abstract start(): Worker<EmailJobPayload>;
  abstract stop(): Promise<void>;
}
