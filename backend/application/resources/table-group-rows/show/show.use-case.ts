import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IField, Merge } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { RowAccessGuardContractService } from '@application/services/row-access-guard/row-access-guard-contract.service';
import { RowPasswordContractService } from '@application/services/row-password/row-password-contract.service';
import { TableGroupContractService } from '@application/services/table-group/table-group-contract.service';
import { TypeGuardContractService } from '@application/services/type-guard/type-guard-contract.service';

import type { GroupRowShowPayload } from '../_shared.validator';

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
    private readonly tableGroup: TableGroupContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const resolved = await this.tableGroup.resolve(
        payload.slug,
        payload.groupSlug,
      );
      if (resolved.isLeft()) return left(resolved.value);
      const { table, groupField } = resolved.value;

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
