import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IField, Merge } from '@application/core/entity.core';
import { E_FIELD_TYPE } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { RowAccessGuardContractService } from '@application/services/row-access-guard/row-access-guard-contract.service';
import { RowPasswordContractService } from '@application/services/row-password/row-password-contract.service';
import { TypeGuardContractService } from '@application/services/type-guard/type-guard-contract.service';

import type { GroupRowShowPayload } from './show.validator';

type Response = Either<HTTPException, Record<string, unknown>>;
type Payload = Merge<GroupRowShowPayload, { __actorUserId?: string }>;

@Service()
export default class GroupRowShowUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
    private readonly rowPasswordService: RowPasswordContractService,
    private readonly rowAccessGuard: RowAccessGuardContractService,
    private readonly typeGuard: TypeGuardContractService,
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

      const denied = await this.rowAccessGuard.assertCanReadParentRow({
        table,
        row,
        actorUserId: payload.__actorUserId,
      });
      if (denied) return left(denied);

      const rawItems = row[groupField.slug];
      let item: Record<string, unknown> | undefined;

      if (Array.isArray(rawItems)) {
        for (const candidate of rawItems) {
          if (!this.typeGuard.isRecord(candidate)) {
            continue;
          }
          const id = candidate._id;
          if (typeof id === 'string' && id === payload.itemId) {
            item = candidate;
            break;
          }
          if (
            this.typeGuard.isRecord(id) &&
            typeof id.toString === 'function' &&
            id.toString() === payload.itemId
          ) {
            item = candidate;
            break;
          }
        }
      }

      if (!item)
        return left(
          HTTPException.NotFound('Item não encontrado', 'ITEM_NOT_FOUND'),
        );

      const group = table.groups?.find((g) => g.slug === payload.groupSlug);
      const groupFields: IField[] = group?.fields || [];
      this.rowPasswordService.mask(item, groupFields);

      return right(item);
    } catch (error) {
      console.error('[group-rows > show][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'GET_GROUP_ROW_ERROR',
        ),
      );
    }
  }
}
