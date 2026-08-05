import { Service } from 'fastify-decorators';
import type { Readable } from 'node:stream';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { ITable } from '@application/core/entity.core';
import { E_TABLE_TYPE } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import {
  TableContractRepository,
  type TableQueryPayload,
} from '@application/repositories/table/table-contract.repository';
import {
  CsvExportContractService,
  type CsvField,
} from '@application/services/csv-export/csv-export-contract.service';
import { DateContractService } from '@application/services/date/date-contract.service';

import type { TableExportCsvPayload } from '../_shared.validator';

type Response = Either<HTTPException, Readable>;

const FIELDS: CsvField[] = [
  { label: 'ID', value: '_id' },
  { label: 'Nome', value: 'name' },
  { label: 'Slug', value: 'slug' },
  { label: 'Tipo', value: 'type' },
  { label: 'Estilo', value: 'style' },
  { label: 'Proprietário', value: 'owner' },
  { label: 'Lixeira', value: 'trashed' },
  { label: 'Criado em', value: 'createdAt' },
  { label: 'Atualizado em', value: 'updatedAt' },
];

@Service()
export default class TableExportCsvUseCase {
  private ownerName(owner: ITable['owner']): string {
    if (!owner) return '';
    if (typeof owner === 'string') return owner;
    return owner.name ?? owner._id ?? '';
  }

  private toCsvRow(table: ITable): Record<string, unknown> {
    let trashed = 'false';
    if (table.trashed) trashed = 'true';
    const createdAt = this.date.toIso(table.createdAt);
    const updatedAt = this.date.toIso(table.updatedAt);
    return {
      _id: table._id,
      name: table.name ?? '',
      slug: table.slug ?? '',
      type: table.type ?? '',
      style: table.style ?? '',
      owner: this.ownerName(table.owner),
      trashed,
      createdAt,
      updatedAt,
    };
  }
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly csvExport: CsvExportContractService,
    private readonly date: DateContractService,
  ) {}

  async execute(payload: TableExportCsvPayload): Promise<Response> {
    try {
      const trashed = payload.trashed === 'true';

      const sort: Record<string, 'asc' | 'desc'> = {};
      if (payload['order-name']) sort.name = payload['order-name'];
      if (payload['order-link']) sort.slug = payload['order-link'];
      if (payload['order-created-at'])
        sort.createdAt = payload['order-created-at'];
      if (payload['order-owner']) sort['owner.name'] = payload['order-owner'];

      const filter: TableQueryPayload = {
        search: payload.search ?? payload.name,
        type: E_TABLE_TYPE.TABLE,
        trashed,
      };
      if (payload.owner) filter.owner = [payload.owner];

      const total = await this.tableRepository.count(filter);

      const overLimit = this.csvExport.rejectWhenOverLimit(total);
      if (overLimit) return left(overLimit);

      console.info(`[table-base > export-csv] count=${total}`);

      const source = this.csvExport.iterateInBatches({
        payload: filter,
        fetchBatch: async (p, page, perPage) => {
          const batch = await this.tableRepository.findMany({
            ...p,
            page,
            perPage,
            sort,
          });
          return batch.map((item) => this.toCsvRow(item));
        },
      });

      const stream = this.csvExport.buildStream({ source, fields: FIELDS });

      return right(stream);
    } catch (error) {
      const limitError = this.csvExport.toHttpException(error);
      if (limitError) return left(limitError);
      console.error('[table-base > export-csv][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'EXPORT_TABLE_CSV_ERROR',
        ),
      );
    }
  }
}
