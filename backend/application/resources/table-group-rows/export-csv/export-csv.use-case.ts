import { Service } from 'fastify-decorators';
import { Readable } from 'node:stream';

import { formatCellValue } from '@application/core/csv/csv-format';
import {
  buildCsvStream,
  EXPORT_CSV_LIMIT,
  type CsvField,
} from '@application/core/csv/csv-stream';
import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IField } from '@application/core/entity.core';
import { E_FIELD_TYPE } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

import type { GroupRowExportCsvPayload } from './export-csv.validator';

type Response = Either<HTTPException, Readable>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function buildFields(groupFields: IField[]): {
  csvFields: CsvField[];
  exportableFields: IField[];
} {
  const exportableFields = groupFields.filter(
    (f) => !f.native || f.slug === '_id' || f.slug === 'creator',
  );

  const csvFields: CsvField[] = exportableFields.map((field) => ({
    label: field.name,
    value: field.slug,
  }));

  return { csvFields, exportableFields };
}

@Service()
export default class GroupRowExportCsvUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
  ) {}

  async execute(payload: GroupRowExportCsvPayload): Promise<Response> {
    try {
      const table = await this.tableRepository.findBySlug(payload.slug);

      if (!table) {
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );
      }

      const groupField = table.fields?.find(
        (f) =>
          f.type === E_FIELD_TYPE.FIELD_GROUP &&
          f.group?.slug === payload.groupSlug,
      );

      if (!groupField) {
        return left(
          HTTPException.NotFound('Grupo não encontrado', 'GROUP_NOT_FOUND'),
        );
      }

      const row = await this.rowRepository.findOne({
        table,
        query: { _id: payload.rowId },
      });

      if (!row) {
        return left(
          HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
        );
      }

      const group = table.groups?.find((g) => g.slug === payload.groupSlug);
      const groupFields: IField[] = group?.fields ?? [];

      const rawItems = row[groupField.slug];
      const items: Record<string, unknown>[] = [];
      if (Array.isArray(rawItems)) {
        for (const item of rawItems) {
          if (isRecord(item)) items.push(item);
        }
      }

      if (items.length > EXPORT_CSV_LIMIT) {
        return left(
          HTTPException.UnprocessableEntity(
            `Resultado excede o limite de ${EXPORT_CSV_LIMIT.toLocaleString('pt-BR')} linhas. Refine os filtros antes de exportar.`,
            'EXPORT_LIMIT_EXCEEDED',
          ),
        );
      }

      console.info(
        `[group-rows > export-csv] table=${table.slug} group=${payload.groupSlug} count=${items.length}`,
      );

      const { csvFields, exportableFields } = buildFields(groupFields);

      const csvRows = items.map((item) => {
        const out: Record<string, unknown> = {};
        for (const field of exportableFields) {
          const raw = item[field.slug];
          out[field.slug] = formatCellValue(raw, { fieldType: field.type });
        }
        return out;
      });

      const source = Readable.from(csvRows, { objectMode: true });
      const stream = buildCsvStream({ source, fields: csvFields });

      return right(stream);
    } catch (error) {
      console.error('[group-rows > export-csv][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'EXPORT_GROUP_ROW_CSV_ERROR',
        ),
      );
    }
  }
}
