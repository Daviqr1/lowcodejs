import { Queue } from 'bullmq';

/**
 * Base das filas BullMQ. As tres filas do backend repetiam o mesmo
 * `getQueue()` preguicoso + `close()`, cada uma com o seu `cachedQueue` — o
 * ciclo de vida e o mesmo, so o nome da fila e o `defaultJobOptions` mudam.
 *
 * Irma da `QueueWorkerBase`: nao e um par contract+impl, e uma base abstrata
 * para as impls, e o contrato de cada fila vive no proprio dominio.
 */
export abstract class QueueBase {
  private cachedQueue: Queue | null = null;

  /** Nome da fila e `defaultJobOptions` — o que muda entre as tres. */
  protected abstract createQueue(): Queue;

  /** Fila preguicosa: so abre conexao quando algo e realmente enfileirado. */
  protected getQueue(): Queue {
    if (this.cachedQueue) return this.cachedQueue;
    this.cachedQueue = this.createQueue();
    return this.cachedQueue;
  }

  /** Id legivel e unico por job: `<job>:<timestamp>:<sufixo aleatorio>`. */
  protected buildJobId(jobName: string): string {
    const suffix = Math.random().toString(36).slice(2, 10);
    return `${jobName}:${Date.now()}:${suffix}`;
  }

  async close(): Promise<void> {
    if (!this.cachedQueue) return;
    await this.cachedQueue.close();
    this.cachedQueue = null;
  }
}
