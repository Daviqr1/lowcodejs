import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IField } from '@application/core/entity.core';
import { E_FIELD_TYPE } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { RowPasswordContractService } from '@application/services/row-password/row-password-contract.service';

import type { GroupRowListPayload } from './list.validator';

type Response = Either<HTTPException, Record<string, unknown>[]>;
type Payload = GroupRowListPayload;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

@Service()
export default class GroupRowListUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
    private readonly rowPasswordService: RowPasswordContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
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
      const items: Record<string, unknown>[] = [];

      if (Array.isArray(rawItems)) {
        for (const item of rawItems) {
          // Mostra rascunhos (status='draft') junto dos publicados; o
          // frontend exibe badge. Oculta apenas itens na lixeira (trashedAt).
          if (isRecord(item) && item.trashedAt == null) {
            items.push(item);
          }
        }
      }

      const group = table.groups?.find((g) => g.slug === payload.groupSlug);
      const groupFields: IField[] = group?.fields || [];
      for (const item of items) {
        this.rowPasswordService.mask(item, groupFields);
      }

      return right(items);
    } catch (error) {
      console.error('[group-rows > list][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'LIST_GROUP_ROWS_ERROR',
        ),
      );
    }
  }
}
