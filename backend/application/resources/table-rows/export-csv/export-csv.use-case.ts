import { Service } from 'fastify-decorators';
import type { Readable } from 'node:stream';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IField, IRow } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import {
  CsvExportContractService,
  EXPORT_CSV_LIMIT,
  ExportLimitExceededError,
  type CsvField,
} from '@application/services/csv-export/csv-export-contract.service';
import { FieldValueContractService } from '@application/services/field-value/field-value-contract.service';
import { FieldVisibilityContractService } from '@application/services/field-visibility/field-visibility-contract.service';
import { RowAccessGuardContractService } from '@application/services/row-access-guard/row-access-guard-contract.service';
import { RowPasswordContractService } from '@application/services/row-password/row-password-contract.service';

import type { TableRowExportCsvPayload } from './export-csv.validator';

type Response = Either<HTTPException, Readable>;

@Service()
export default class TableRowExportCsvUseCase {
  private buildFields(
    tableFields: IField[],
    hiddenSlugs: Set<string>,
  ): {
    csvFields: CsvField[];
    exportableFields: IField[];
  } {
    const exportableFields = tableFields.filter(
      (f) =>
        (!f.native || f.slug === '_id' || f.slug === 'creator') &&
        !hiddenSlugs.has(f.slug),
    );

    const csvFields: CsvField[] = exportableFields.map((field) => ({
      label: field.name,
      value: field.slug,
    }));

    return { csvFields, exportableFields };
  }
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
    private readonly rowPasswordService: RowPasswordContractService,
    private readonly fieldVisibility: FieldVisibilityContractService,
    private readonly rowAccessGuard: RowAccessGuardContractService,
    private readonly fieldValue: FieldValueContractService,
    private readonly csvExport: CsvExportContractService,
  ) {}

  private toCsvRow(row: IRow, fields: IField[]): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const field of fields) {
      out[field.slug] = this.fieldValue.format(row[field.slug], {
        fieldType: field.type,
      });
    }
    return out;
  }

  async execute(payload: TableRowExportCsvPayload): Promise<Response> {
    try {
      const table = await this.tableRepository.findBySlug(payload.slug);

      if (!table) {
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );
      }

      // Mesmo filtro da listagem: sem isto o export devolve as rows que o
      // guard esconde em `paginated`.
      const ctx = await this.rowAccessGuard.resolveContext(payload.user);
      const guardQuery = await this.rowAccessGuard.composeListQuery(
        table._id.toString(),
        {},
        ctx,
        table,
      );

      let guardQueryArg: Record<string, unknown> | undefined = undefined;
      if (Object.keys(guardQuery).length > 0) guardQueryArg = guardQuery;

      const total = await this.rowRepository.count(
        table,
        payload,
        guardQueryArg,
      );

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

      const hidden = await this.fieldVisibility.hiddenSlugs({
        fields: table.fields,
        context: 'list',
        userId: payload.user,
        isOwner: payload.isOwner,
        isAdministrator: payload.isAdministrator,
      });

      const { csvFields, exportableFields } = this.buildFields(
        table.fields,
        hidden,
      );

      const source = this.csvExport.iterateInBatches({
        payload,
        fetchBatch: async (p, page, perPage) => {
          const skip = (page - 1) * perPage;
          const rows = await this.rowRepository.findMany({
            table,
            rawFilters: p,
            skip,
            limit: perPage,
            guardQuery: guardQueryArg,
          });
          return rows.map((row) => {
            this.rowPasswordService.mask(row, table.fields);
            return this.toCsvRow(row, exportableFields);
          });
        },
      });

      const stream = this.csvExport.buildStream({ source, fields: csvFields });

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
