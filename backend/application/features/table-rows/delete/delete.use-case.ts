import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { Merge } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { RelationshipDeletionContractService } from '@application/services/relationship/relationship-deletion-contract.service';
import { RowAccessGuardContractService } from '@application/services/row-access-guard/row-access-guard-contract.service';
import { RowOwnershipContractService } from '@application/services/row-ownership/row-ownership-contract.service';

import type { TableRowDeletePayload } from '../_shared.validator';

type Response = Either<HTTPException, null>;
type Payload = Merge<
  TableRowDeletePayload,
  {
    __actorUserId?: string;
    // Convidado contributor: só pode remover os próprios registros.
    __ownOnly?: boolean;
  }
>;

@Service()
export default class TableRowDeleteUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
    private readonly relationshipDeletion: RelationshipDeletionContractService,
    private readonly rowAccessGuard: RowAccessGuardContractService,
    private readonly rowOwnership: RowOwnershipContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const table = await this.tableRepository.findBySlug(payload.slug);

      if (!table) {
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );
      }

      // Convidado contributor só remove o que criou.
      if (payload.__ownOnly) {
        const current = await this.rowRepository.findOne({
          table,
          query: { _id: payload._id },
          includeTrashed: true,
        });

        if (!current) {
          return left(
            HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
          );
        }

        const creatorId = this.rowOwnership.resolveCreatorId(current.creator);
        if (!payload.__actorUserId || creatorId !== payload.__actorUserId) {
          return left(
            HTTPException.Forbidden(
              'Você só pode remover os seus próprios registros',
              'OWN_ROW_ONLY',
            ),
          );
        }
      }

      // Carrega a row para o guard (necessário para canWrite delete).
      // Exclusao definitiva age tambem sobre o que ja esta na lixeira.
      const row = await this.rowRepository.findOne({
        table,
        query: { _id: payload._id },
        includeTrashed: true,
      });

      if (!row) {
        return left(
          HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
        );
      }

      // Verifica permissão de delete via guard.
      let actorUserId: string | undefined;
      if (typeof payload.__actorUserId === 'string') {
        actorUserId = payload.__actorUserId;
      }
      const ctx = await this.rowAccessGuard.resolveContext(actorUserId);
      const tableId = table._id.toString();

      const writeDecision = await this.rowAccessGuard.composeWriteDecision(
        tableId,
        row,
        ctx,
        table,
        null,
        'delete',
      );
      if (writeDecision.decision === 'deny') {
        return left(
          HTTPException.Forbidden(
            writeDecision.reason ?? 'Acesso negado',
            'ROW_WRITE_RESTRICTED',
          ),
        );
      }

      // onDelete (§9): RESTRICT bloqueia; SET_NULL/CASCADE removem links e
      // registros filhos antes de remover o proprio registro.
      const onDelete = await this.relationshipDeletion.applyOnDelete(
        table,
        payload._id,
      );
      if (onDelete.isLeft()) return left(onDelete.value);

      const deleted = await this.rowRepository.deleteOne(table, payload._id);

      if (!deleted) {
        return left(
          HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND'),
        );
      }

      return right(null);
    } catch (error) {
      console.error('[table-rows > delete][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'DELETE_ROW_ERROR',
        ),
      );
    }
  }
}
