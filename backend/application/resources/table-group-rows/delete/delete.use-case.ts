import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import { E_FIELD_TYPE, type Merge } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { resolveCreatorId } from '@application/core/row-ownership.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { RowAccessGuardContractService } from '@application/services/row-access-guard/row-access-guard-contract.service';

import { assertCanWriteParentRow } from '../guard-parent-row';

import type { GroupRowDeletePayload } from './delete.validator';

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
        const creatorId = resolveCreatorId(existingRow.creator);
        if (!payload.__actorUserId || creatorId !== payload.__actorUserId) {
          return left(
            HTTPException.Forbidden(
              'Você só pode remover os seus próprios registros',
              'OWN_ROW_ONLY',
            ),
          );
        }
      }

      const denied = await assertCanWriteParentRow(this.rowAccessGuard, {
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
