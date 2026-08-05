import { Service } from 'fastify-decorators';
import type { Readable } from 'node:stream';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IMenu } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { MenuContractRepository } from '@application/repositories/menu/menu-contract.repository';
import {
  CsvExportContractService,
  type CsvField,
} from '@application/services/csv-export/csv-export-contract.service';
import { DateContractService } from '@application/services/date/date-contract.service';

import type { MenuExportCsvPayload } from '../_shared.validator';

type Response = Either<HTTPException, Readable>;

const FIELDS: CsvField[] = [
  { label: 'ID', value: '_id' },
  { label: 'Nome', value: 'name' },
  { label: 'Slug', value: 'slug' },
  { label: 'Tipo', value: 'type' },
  { label: 'Tabela', value: 'table' },
  { label: 'Parent', value: 'parent' },
  { label: 'URL', value: 'url' },
  { label: 'Ordem', value: 'order' },
  { label: 'Inicial', value: 'isInitial' },
  { label: 'Criado em', value: 'createdAt' },
  { label: 'Atualizado em', value: 'updatedAt' },
];

@Service()
export default class MenuExportCsvUseCase {
  private buildSort(
    sort: Record<string, 'asc' | 'desc'>,
  ): Record<string, 'asc' | 'desc'> {
    if (Object.keys(sort).length > 0) return sort;
    return { order: 'asc' };
  }

  private toCsvRow(menu: IMenu): Record<string, unknown> {
    let table = '';
    if (typeof menu.table === 'string') table = menu.table;
    let parent = '';
    if (typeof menu.parent === 'string') parent = menu.parent;
    let isInitial = 'false';
    if (menu.isInitial) isInitial = 'true';
    const createdAt = this.date.toIso(menu.createdAt);
    const updatedAt = this.date.toIso(menu.updatedAt);
    return {
      _id: menu._id,
      name: menu.name ?? '',
      slug: menu.slug ?? '',
      type: menu.type ?? '',
      table,
      parent,
      url: menu.url ?? '',
      order: menu.order ?? 0,
      isInitial,
      createdAt,
      updatedAt,
    };
  }
  constructor(
    private readonly menuRepository: MenuContractRepository,
    private readonly csvExport: CsvExportContractService,
    private readonly date: DateContractService,
  ) {}

  async execute(payload: MenuExportCsvPayload): Promise<Response> {
    try {
      const sort: Record<string, 'asc' | 'desc'> = {};
      if (payload['order-name']) sort.name = payload['order-name'];
      if (payload['order-position']) sort.order = payload['order-position'];
      if (payload['order-slug']) sort.slug = payload['order-slug'];
      if (payload['order-type']) sort.type = payload['order-type'];
      if (payload['order-created-at'])
        sort.createdAt = payload['order-created-at'];

      const total = await this.menuRepository.count({
        search: payload.search,
        trashed: payload.trashed ?? false,
      });

      const overLimit = this.csvExport.rejectWhenOverLimit(total);
      if (overLimit) return left(overLimit);

      console.info(`[menu > export-csv] count=${total}`);

      const source = this.csvExport.iterateInBatches({
        payload: { ...payload, sort },
        fetchBatch: async (p, page, perPage) => {
          const batch = await this.menuRepository.findMany({
            page,
            perPage,
            search: p.search,
            trashed: p.trashed ?? false,
            sort: this.buildSort(p.sort),
          });
          return batch.map((item) => this.toCsvRow(item));
        },
      });

      const stream = this.csvExport.buildStream({ source, fields: FIELDS });

      return right(stream);
    } catch (error) {
      const limitError = this.csvExport.toHttpException(error);
      if (limitError) return left(limitError);
      console.error('[menu > export-csv][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'EXPORT_MENU_CSV_ERROR',
        ),
      );
    }
  }
}
