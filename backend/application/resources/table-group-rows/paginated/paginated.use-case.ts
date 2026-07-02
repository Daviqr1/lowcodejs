/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IField, IMeta, Paginated } from '@application/core/entity.core';
import { E_FIELD_TYPE } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { RowPasswordContractService } from '@application/services/row-password/row-password-contract.service';

import type { GroupRowPaginatedPayload } from './paginated.validator';

type Response = Either<HTTPException, Paginated<Record<string, unknown>>>;
type Payload = GroupRowPaginatedPayload;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

@Service()
export default class GroupRowPaginatedUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
    private readonly rowPasswordService: RowPasswordContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const page = Math.max(1, Number(payload.page) || 1);
      const perPage = Math.max(1, Number(payload.perPage) || 50);
      const skip = (page - 1) * perPage;

      const table = await this.tableRepository.findBySlug(payload.slug);

      if (!table)
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );

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

      if (!row)
        return left(
          HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
        );

      const rawItems = row[groupField.slug];
      const allItems: Record<string, unknown>[] = [];

      if (Array.isArray(rawItems)) {
        for (const item of rawItems) {
          // Mostra rascunhos (status='draft') junto dos publicados; o
          // frontend exibe badge. Oculta apenas itens na lixeira (trashedAt).
          if (isRecord(item) && item.trashedAt == null) {
            allItems.push(item);
          }
        }
      }

      const total = allItems.length;
      const lastPage = Math.max(1, Math.ceil(total / perPage));

      const meta: IMeta = {
        total,
        perPage,
        page,
        lastPage,
        firstPage: Number(total > 0),
      };

      const paginated = allItems.slice(skip, skip + perPage);

      const group = table.groups?.find((g) => g.slug === payload.groupSlug);
      const groupFields: IField[] = group?.fields || [];
      for (const item of paginated) {
        this.rowPasswordService.mask(item, groupFields);
      }

      return right({ data: paginated, meta });
    } catch (error) {
      console.error('[group-rows > paginated][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'LIST_GROUP_ROWS_PAGINATED_ERROR',
        ),
      );
    }
  }
}
