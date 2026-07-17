import { Service } from 'fastify-decorators';
import type { Readable } from 'node:stream';

import { formatCellValue } from '@application/core/csv/csv-format';
import {
  buildCsvStream,
  EXPORT_CSV_LIMIT,
  ExportLimitExceededError,
  iterateInBatches,
  type CsvField,
} from '@application/core/csv/csv-stream';
import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IField, IRow } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

import type { TableRowExportCsvPayload } from './export-csv.validator';

type Response = Either<HTTPException, Readable>;

function buildFields(tableFields: IField[]): {
  csvFields: CsvField[];
  exportableFields: IField[];
} {
  const exportableFields = tableFields.filter(
    (f) => !f.native || f.slug === '_id' || f.slug === 'creator',
  );

  const csvFields: CsvField[] = exportableFields.map((field) => ({
    label: field.name,
    value: field.slug,
  }));

  return { csvFields, exportableFields };
}

function toCsvRow(row: IRow, fields: IField[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = row[field.slug];
    out[field.slug] = formatCellValue(raw, { fieldType: field.type });
  }
  return out;
}

@Service()
export default class TableRowExportCsvUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
  ) {}

  async execute(payload: TableRowExportCsvPayload): Promise<Response> {
    try {
      const table = await this.tableRepository.findBySlug(payload.slug);

      if (!table) {
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );
      }

      const total = await this.rowRepository.count(table, payload);

      if (total > EXPORT_CSV_LIMIT) {
        return left(
          HTTPException.UnprocessableEntity(
            `Resultado excede o limite de ${EXPORT_CSV_LIMIT.toLocaleString('pt-BR')} linhas. Refine os filtros antes de exportar.`,
            'EXPORT_LIMIT_EXCEEDED',
          ),
        );
      }

      console.info(
        `[table-rows > export-csv] table=${table.slug} user=${payload.user ?? 'unknown'} count=${total}`,
      );

      const { csvFields, exportableFields } = buildFields(table.fields);

      const source = iterateInBatches({
        payload,
        fetchBatch: async (p, page, perPage) => {
          const skip = (page - 1) * perPage;
          const rows = await this.rowRepository.findMany({
            table,
            rawFilters: p,
            skip,
            limit: perPage,
          });
          return rows.map((row) => toCsvRow(row, exportableFields));
        },
      });

      const stream = buildCsvStream({ source, fields: csvFields });

      return right(stream);
    } catch (error) {
      if (error instanceof ExportLimitExceededError) {
        return left(
          HTTPException.UnprocessableEntity(error.message, error.cause),
        );
      }
      console.error('[table-rows > export-csv][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'EXPORT_TABLE_ROW_CSV_ERROR',
        ),
      );
    }
  }
}
