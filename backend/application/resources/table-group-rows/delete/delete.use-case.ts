import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { Merge } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { RowAccessGuardContractService } from '@application/services/row-access-guard/row-access-guard-contract.service';
import { RowOwnershipContractService } from '@application/services/row-ownership/row-ownership-contract.service';
import { TableGroupContractService } from '@application/services/table-group/table-group-contract.service';

import type { GroupRowDeletePayload } from '../_shared.validator';

type Response = Either<HTTPException, null>;
type Payload = Merge<
  GroupRowDeletePayload,
  {
    __actorUserId?: string;
    // Convidado contributor: só remove itens da própria row pai.
    __ownOnly?: boolean;
  }
>;

@Service()
export default class GroupRowDeleteUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
    private readonly rowAccessGuard: RowAccessGuardContractService,
    private readonly rowOwnership: RowOwnershipContractService,
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

      // Verifica se a row existe
      const existingRow = await this.rowRepository.findOne({
        table,
        query: { _id: payload.rowId },
      });

      if (!existingRow)
        return left(
          HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
        );

      // Convidado contributor só remove itens da row pai que ele criou.
      if (payload.__ownOnly) {
        const creatorId = this.rowOwnership.resolveCreatorId(
          existingRow.creator,
        );
        if (!payload.__actorUserId || creatorId !== payload.__actorUserId) {
          return left(
            HTTPException.Forbidden(
              'Você só pode remover os seus próprios registros',
              'OWN_ROW_ONLY',
            ),
          );
        }
      }

      const denied = await this.rowAccessGuard.assertCanWriteParentRow({
        table,
        row: existingRow,
        actorUserId: payload.__actorUserId,
        operation: 'delete',
      });
      if (denied) return left(denied);

      // Remove o subdocumento
      const deleted = await this.rowRepository.deleteGroupItem({
        table,
        rowId: payload.rowId,
        groupFieldSlug: groupField.slug,
        itemId: payload.itemId,
      });

      if (!deleted)
        return left(
          HTTPException.NotFound('Item não encontrado', 'ITEM_NOT_FOUND'),
        );

      return right(null);
    } catch (error) {
      console.error('[group-rows > delete][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'DELETE_GROUP_ROW_ERROR',
        ),
      );
    }
  }
}
