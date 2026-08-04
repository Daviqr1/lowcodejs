import type { Worker } from 'bullmq';

/**
 * Base dos workers BullMQ. Os tres workers do backend repetiam o mesmo par
 * `start()` idempotente + `stop()`, cada um com o seu `let cachedWorker` — o
 * ciclo de vida e o mesmo, so o job muda.
 *
 * Nao e um par contract+impl: e uma base abstrata para as impls, e o contrato de
 * cada worker vive no proprio dominio (`EmailWorkerContractService`, etc.).
 */
export abstract class QueueWorkerBase<TPayload = unknown> {
  protected worker: Worker<TPayload> | null = null;

  /** Constroi o worker. Chamado uma unica vez por `start()`. */
  protected abstract createWorker(): Worker<TPayload>;

  /** Idempotente: chamadas repetidas devolvem o mesmo worker. */
  start(): Worker<TPayload> {
    if (this.worker) return this.worker;
    this.worker = this.createWorker();
    return this.worker;
  }

  async stop(): Promise<void> {
    if (!this.worker) return;
    await this.worker.close();
    this.worker = null;
  }
}
