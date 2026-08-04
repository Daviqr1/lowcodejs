import type { Readable } from 'node:stream';

export const EXPORT_CSV_LIMIT = 500_000;

export class ExportLimitExceededError extends Error {
  override readonly cause = 'EXPORT_LIMIT_EXCEEDED';

  constructor(readonly limit: number = EXPORT_CSV_LIMIT) {
    super(
      `Resultado excede o limite máximo de ${limit.toLocaleString('pt-BR')} linhas para exportação.`,
    );
  }
}

export type CsvField = { label: string; value: string };

/** Busca uma pagina de registros. Recebe o payload original do use-case. */
export type CsvBatchFetcher<TPayload, TEntity> = (
  payload: TPayload,
  page: number,
  perPage: number,
) => Promise<TEntity[]>;

export type CsvBatchOptions<TPayload, TEntity> = {
  payload: TPayload;
  fetchBatch: CsvBatchFetcher<TPayload, TEntity>;
  batchSize?: number;
  limit?: number;
};

export type CsvStreamOptions<TRow extends Record<string, unknown>> = {
  source: AsyncIterable<TRow>;
  fields: CsvField[];
  delimiter?: string;
};

/** Exportacao de CSV em streaming, sem carregar a colecao inteira em memoria. */
export abstract class CsvExportContractService {
  /**
   * Itera registros em batches sequenciais. O teto de `limit` linhas e defesa
   * em profundidade — o use-case deve checar `count()` antes, para falhar cedo
   * com 422 em vez de no meio do stream.
   */
  abstract iterateInBatches<TPayload, TEntity>(
    options: CsvBatchOptions<TPayload, TEntity>,
  ): AsyncGenerator<TEntity>;

  /** Nome de arquivo padronizado: `<prefixo>-YYYY-MM-DD.csv`. */
  abstract filename(prefix: string, date?: Date): string;

  /** Stream CSV com BOM UTF-8 e cabecalho, a partir da fonte assincrona. */
  abstract buildStream<TRow extends Record<string, unknown>>(
    options: CsvStreamOptions<TRow>,
  ): Readable;
}
