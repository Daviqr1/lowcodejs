/**
 * BullMQ Worker para importação de CSV.
 *
 * Consome jobs da fila `csv-import`. Cada job carrega { slug, userId, csvContent }.
 * O worker parseia o CSV, valida cada linha, cria as rows e emite progresso
 * em tempo real via Socket.IO no namespace `/csv-import`.
 *
 * Retry: attempts: 1 — erros de CSV não devem ser reprocessados automaticamente.
 */
import { Worker, type Job } from 'bullmq';
import csv from 'csv-parser';
import { Service } from 'fastify-decorators';
import { Readable } from 'node:stream';
import type { Namespace } from 'socket.io';

import {
  type IField,
  type IGroupConfiguration,
} from '@application/core/entity.core';
import type { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import type { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { FieldValueContractService } from '@application/services/field-value/field-value-contract.service';
import { QueueWorkerBase } from '@application/services/queue-worker/queue-worker.base';
import { RedisContractService } from '@application/services/redis/redis-contract.service';
import type { RowAccessGuardContractService } from '@application/services/row-access-guard/row-access-guard-contract.service';
import type { RowPasswordContractService } from '@application/services/row-password/row-password-contract.service';
import { RowPayloadValidatorContractService } from '@application/services/row-payload-validator/row-payload-validator-contract.service';

import {
  CSV_IMPORT_JOB,
  CSV_IMPORT_QUEUE_NAME,
  type CsvImportJobPayload,
} from './csv-import-queue-contract.service';
import {
  CSV_IMPORT_EVENT,
  type CsvImportCompletedEvent,
  type CsvImportErrorEvent,
  type CsvImportProgressEvent,
  type CsvImportSocketInit,
} from './csv-import-socket-contract.service';
import { CsvImportSocketContractService } from './csv-import-socket-contract.service';
import { CsvImportWorkerContractService } from './csv-import-worker-contract.service';
import { RelationshipResolverContractService } from './relationship-resolver-contract.service';

export const IMPORT_CSV_LIMIT = 10_000;

const PROGRESS_INTERVAL = 100;

type WorkerDeps = {
  namespace: Namespace;
  storeResult: CsvImportSocketInit['storeResult'];
  tableRepository: TableContractRepository;
  rowRepository: RowContractRepository;
  rowPasswordService: RowPasswordContractService;
  rowAccessGuard: RowAccessGuardContractService;
  fieldValue: FieldValueContractService;
  rowPayloadValidator: RowPayloadValidatorContractService;
  relationshipResolver: RelationshipResolverContractService;
};

@Service()
export default class CsvImportWorkerService
  extends QueueWorkerBase<CsvImportJobPayload>
  implements CsvImportWorkerContractService
{
  private parseCsv(csvContent: string): Promise<Array<Record<string, string>>> {
    return new Promise((resolve, reject) => {
      const results: Array<Record<string, string>> = [];
      const stream = Readable.from(csvContent);

      stream
        .pipe(csv())
        .on('data', (row: Record<string, string>) => {
          results.push(row);
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (err: Error) => {
          reject(err);
        });
    });
  }

  private buildFieldMap(
    headers: string[],
    fields: IField[],
  ): Map<string, IField> {
    const map = new Map<string, IField>();

    for (const header of headers) {
      let matched: IField | undefined;

      for (const field of fields) {
        if (field.native) continue;
        if (field.slug === header) {
          matched = field;
          break;
        }
      }

      if (!matched) {
        for (const field of fields) {
          if (field.native) continue;
          if (field.name.toLowerCase() === header.toLowerCase()) {
            matched = field;
            break;
          }
        }
      }

      if (matched) {
        map.set(header, matched);
      }
    }

    return map;
  }

  private async processImportJob(
    job: Job<CsvImportJobPayload>,
    deps: WorkerDeps,
  ): Promise<void> {
    const { slug, userId, csvContent } = job.data;
    const jobId = job.id ?? '';
    const room = 'job:' + jobId;

    const table = await deps.tableRepository.findBySlug(slug);

    if (!table) {
      const errorEvt: CsvImportErrorEvent = {
        job_id: jobId,
        message: 'Tabela não encontrada',
        cause: 'TABLE_NOT_FOUND',
      };
      deps.storeResult(jobId, { kind: 'error', event: errorEvt });
      deps.namespace.to(room).emit(CSV_IMPORT_EVENT.ERROR, errorEvt);
      return;
    }

    const rows = await this.parseCsv(csvContent);

    if (rows.length > IMPORT_CSV_LIMIT) {
      const errorEvt: CsvImportErrorEvent = {
        job_id: jobId,
        message: `Arquivo excede ${IMPORT_CSV_LIMIT.toLocaleString('pt-BR')} linhas`,
        cause: 'IMPORT_LIMIT_EXCEEDED',
      };
      deps.storeResult(jobId, { kind: 'error', event: errorEvt });
      deps.namespace.to(room).emit(CSV_IMPORT_EVENT.ERROR, errorEvt);
      return;
    }

    const firstRow = rows[0];
    const headers: string[] = [];
    if (firstRow) {
      headers.push(...Object.keys(firstRow));
    }
    const fieldMap = this.buildFieldMap(headers, table.fields);

    const resolvers = await deps.relationshipResolver.build(rows, fieldMap);

    let imported = 0;
    let skipped = 0;
    const total = rows.length;
    const groups: IGroupConfiguration[] = table.groups ?? [];
    const guardContext = await deps.rowAccessGuard.resolveContext(userId);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const payload: Record<string, unknown> = {};

      for (const [col, field] of fieldMap) {
        const raw = row[col] ?? '';
        payload[field.slug] = deps.fieldValue.coerce(
          raw,
          field,
          resolvers.get(col),
        );
      }

      payload['creator'] = userId;

      const errors = deps.rowPayloadValidator.validate(
        payload,
        table.fields,
        groups,
      );

      if (errors) {
        skipped++;

        const isLast = i === rows.length - 1;
        const isInterval = (i + 1) % PROGRESS_INTERVAL === 0;

        if (isInterval || isLast) {
          const progressEvt: CsvImportProgressEvent = {
            job_id: jobId,
            processed: i + 1,
            total,
          };
          deps.namespace.to(room).emit(CSV_IMPORT_EVENT.PROGRESS, progressEvt);
        }

        continue;
      }

      await deps.rowPasswordService.hash(payload, table.fields);

      // Sem o sanitize, uma coluna de visibilidade no CSV entrava crua — dava
      // para importar rows num nivel que o proprio usuario nao enxerga.
      const sanitized = await deps.rowAccessGuard.composeSanitize(
        table._id.toString(),
        payload,
        guardContext,
        table,
        'create',
        null,
      );

      await deps.rowRepository.create({ table, data: sanitized });

      imported++;

      const isLast = i === rows.length - 1;
      const isInterval = (i + 1) % PROGRESS_INTERVAL === 0;

      if (isInterval || isLast) {
        const progressEvt: CsvImportProgressEvent = {
          job_id: jobId,
          processed: i + 1,
          total,
        };
        deps.namespace.to(room).emit(CSV_IMPORT_EVENT.PROGRESS, progressEvt);
      }
    }

    const completedEvt: CsvImportCompletedEvent = {
      job_id: jobId,
      imported,
      skipped,
      total,
    };
    deps.storeResult(jobId, { kind: 'completed', event: completedEvt });
    deps.namespace.to(room).emit(CSV_IMPORT_EVENT.COMPLETED, completedEvt);
  }
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
    private readonly rowPasswordService: RowPasswordContractService,
    private readonly rowAccessGuard: RowAccessGuardContractService,
    private readonly fieldValue: FieldValueContractService,
    private readonly rowPayloadValidator: RowPayloadValidatorContractService,
    private readonly relationshipResolver: RelationshipResolverContractService,
    private readonly socket: CsvImportSocketContractService,
    private readonly redis: RedisContractService,
  ) {
    super();
  }

  protected createWorker(): Worker<CsvImportJobPayload> {
    const worker = new Worker<CsvImportJobPayload>(
      CSV_IMPORT_QUEUE_NAME,
      async (job: Job<CsvImportJobPayload>): Promise<void> => {
        if (job.name === CSV_IMPORT_JOB.IMPORT) {
          await this.processImportJob(job, this.deps());
          return;
        }
        console.warn(`[CsvImportWorker] Job desconhecido: ${job.name}`);
      },
      {
        connection: this.redis.createQueueConnection(),
        concurrency: 3,
      },
    );

    worker.on('completed', (job: Job<CsvImportJobPayload>): void => {
      console.info(`[CsvImportWorker] Job ${job.id} processado`);
    });

    worker.on(
      'failed',
      (job: Job<CsvImportJobPayload> | undefined, err: Error): void => {
        console.error(
          `[CsvImportWorker] Job ${job?.id} falhou (tentativa ${job?.attemptsMade ?? '?'}):`,
          err.message,
        );
      },
    );

    return worker;
  }

  /**
   * O namespace so existe depois que o socket sobe (`bin/server.ts`); por isso
   * as deps sao montadas por chamada, nao no constructor.
   */
  private deps(): WorkerDeps {
    const namespace = this.socket.namespace();
    if (!namespace) {
      throw new Error(
        '[CsvImportWorker] namespace /csv-import nao inicializado',
      );
    }

    return {
      namespace,
      storeResult: (jobId, result) => this.socket.storeResult(jobId, result),
      tableRepository: this.tableRepository,
      rowRepository: this.rowRepository,
      rowPasswordService: this.rowPasswordService,
      rowAccessGuard: this.rowAccessGuard,
      fieldValue: this.fieldValue,
      rowPayloadValidator: this.rowPayloadValidator,
      relationshipResolver: this.relationshipResolver,
    };
  }
}
