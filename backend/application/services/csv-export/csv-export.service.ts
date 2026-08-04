import { AsyncParser } from '@json2csv/node';
import { Service } from 'fastify-decorators';
import { Readable } from 'node:stream';

import HTTPException from '@application/core/exception.core';
import { DateContractService } from '@application/services/date/date-contract.service';
import { SlugContractService } from '@application/services/slug/slug-contract.service';

import type {
  CsvBatchOptions,
  CsvStreamOptions,
} from './csv-export-contract.service';
import {
  CsvExportContractService,
  EXPORT_CSV_LIMIT,
  ExportLimitExceededError,
} from './csv-export-contract.service';

const DEFAULT_BATCH_SIZE = 1000;
const FILENAME_FALLBACK = 'export';

@Service()
export default class CsvExportService implements CsvExportContractService {
  constructor(
    private readonly slugService: SlugContractService,
    private readonly dateService: DateContractService,
  ) {}

  filename(prefix: string, date?: Date): string {
    const safePrefix = this.slugService.normalize(prefix) || FILENAME_FALLBACK;
    return `${safePrefix}-${this.dateService.isoDate(date ?? this.dateService.now())}.csv`;
  }

  async *iterateInBatches<TPayload, TEntity>(
    options: CsvBatchOptions<TPayload, TEntity>,
  ): AsyncGenerator<TEntity> {
    const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
    const limit = options.limit ?? EXPORT_CSV_LIMIT;
    let page = 1;
    let emitted = 0;

    while (true) {
      const batch = await options.fetchBatch(options.payload, page, batchSize);
      if (batch.length === 0) break;

      for (const item of batch) {
        if (emitted >= limit) throw new ExportLimitExceededError(limit);
        emitted++;
        yield item;
      }

      if (batch.length < batchSize) break;
      page += 1;
    }
  }

  buildStream<TRow extends Record<string, unknown>>(
    options: CsvStreamOptions<TRow>,
  ): Readable {
    const parser = new AsyncParser({
      fields: options.fields,
      withBOM: true,
      header: true,
      delimiter: options.delimiter ?? ',',
      defaultValue: '',
    });

    // `AsyncParser.parse` despacha AsyncIterable como objeto unico (bug interno
    // da lib), entao convertemos para Readable em objectMode antes.
    const input = Readable.from(options.source, { objectMode: true });
    // `parse` devolve JSON2CSVNodeTransform, que estende Transform -> Readable.
    return parser.parse(input);
  }

  rejectWhenOverLimit(total: number): HTTPException | null {
    if (total <= EXPORT_CSV_LIMIT) return null;

    return HTTPException.UnprocessableEntity(
      `Resultado excede o limite de ${EXPORT_CSV_LIMIT.toLocaleString('pt-BR')} linhas. Refine os filtros antes de exportar.`,
      'EXPORT_LIMIT_EXCEEDED',
    );
  }

  toHttpException(error: unknown): HTTPException | null {
    if (!(error instanceof ExportLimitExceededError)) return null;
    return HTTPException.UnprocessableEntity(error.message, error.cause);
  }
}
