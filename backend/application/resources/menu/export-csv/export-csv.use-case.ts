import { Service } from 'fastify-decorators';
import type { Readable } from 'node:stream';

import {
  buildCsvStream,
  EXPORT_CSV_LIMIT,
  ExportLimitExceededError,
  iterateInBatches,
  type CsvField,
} from '@application/core/csv/csv-stream';
import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IMenu } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { MenuContractRepository } from '@application/repositories/menu/menu-contract.repository';

import type { MenuExportCsvPayload } from './export-csv.validator';

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

function buildSort(
  sort: Record<string, 'asc' | 'desc'>,
): Record<string, 'asc' | 'desc'> {
  if (Object.keys(sort).length > 0) return sort;
  return { order: 'asc' };
}

function toCsvRow(menu: IMenu): Record<string, unknown> {
  let table = '';
  if (typeof menu.table === 'string') table = menu.table;
  let parent = '';
  if (typeof menu.parent === 'string') parent = menu.parent;
  let isInitial = 'false';
  if (menu.isInitial) isInitial = 'true';
  let createdAt = '';
  if (menu.createdAt) createdAt = new Date(menu.createdAt).toISOString();
  let updatedAt = '';
  if (menu.updatedAt) updatedAt = new Date(menu.updatedAt).toISOString();
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

@Service()
export default class MenuExportCsvUseCase {
  constructor(private readonly menuRepository: MenuContractRepository) {}

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

      if (total > EXPORT_CSV_LIMIT) {
        return left(
          HTTPException.UnprocessableEntity(
            `Resultado excede o limite de ${EXPORT_CSV_LIMIT.toLocaleString('pt-BR')} linhas. Refine os filtros antes de exportar.`,
            'EXPORT_LIMIT_EXCEEDED',
          ),
        );
      }

      console.info(`[menu > export-csv] count=${total}`);

      const source = iterateInBatches({
        payload: { ...payload, sort },
        fetchBatch: async (p, page, perPage) => {
          const batch = await this.menuRepository.findMany({
            page,
            perPage,
            search: p.search,
            trashed: p.trashed ?? false,
            sort: buildSort(p.sort),
          });
          return batch.map(toCsvRow);
        },
      });

      const stream = buildCsvStream({ source, fields: FIELDS });

      return right(stream);
    } catch (error) {
      if (error instanceof ExportLimitExceededError) {
        return left(
          HTTPException.UnprocessableEntity(error.message, error.cause),
        );
      }
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
