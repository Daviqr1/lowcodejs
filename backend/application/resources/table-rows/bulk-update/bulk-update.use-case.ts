import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { FieldValidationContractService } from '@application/services/field-validation/field-validation-contract.service';
import { FieldVisibilityContractService } from '@application/services/field-visibility/field-visibility-contract.service';
import { KanbanCommentMentionContractService } from '@application/services/kanban-comment-mention/kanban-comment-mention-contract.service';
import { RowAccessGuardContractService } from '@application/services/row-access-guard/row-access-guard-contract.service';
import { RowMemberNotificationContractService } from '@application/services/row-member-notification/row-member-notification-contract.service';
import { RowPasswordContractService } from '@application/services/row-password/row-password-contract.service';
import { ScriptExecutionContractService } from '@application/services/script-execution/script-execution-contract.service';

import TableRowUpdateUseCase from '../update/update.use-case';

import type { BulkUpdatePayload } from './bulk-update.validator';

type Result = { modified: number; errors?: Record<string, string> };

type Response = Either<HTTPException, Result>;

/**
 * Atualiza o mesmo conjunto de campos (`data`) em varios registros.
 *
 * Reutiliza integralmente o TableRowUpdateUseCase (validacao, hash de senha,
 * script beforeSave e notificacao de mencoes) executando-o uma vez por id, de
 * forma sequencial. Assim cada registro fica identico ao que seria se editado
 * individualmente. Falhas por registro nao abortam o lote: cada id que falha
 * entra no mapa `errors` (id -> cause), o restante segue sendo atualizado.
 */
@Service()
export default class BulkUpdateUseCase {
  private readonly updateUseCase: TableRowUpdateUseCase;

  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
    private readonly userRepository: UserContractRepository,
    private readonly rowPasswordService: RowPasswordContractService,
    private readonly scriptExecutionService: ScriptExecutionContractService,
    private readonly kanbanCommentMentionService: KanbanCommentMentionContractService,
    private readonly rowMemberNotificationService: RowMemberNotificationContractService,
    private readonly fieldVisibility: FieldVisibilityContractService,
    private readonly fieldValidation: FieldValidationContractService,
    private readonly rowAccessGuard: RowAccessGuardContractService,
  ) {
    this.updateUseCase = new TableRowUpdateUseCase(
      tableRepository,
      rowRepository,
      userRepository,
      rowPasswordService,
      scriptExecutionService,
      kanbanCommentMentionService,
      rowMemberNotificationService,
      fieldVisibility,
      fieldValidation,
      rowAccessGuard,
    );
  }

  async execute(payload: BulkUpdatePayload): Promise<Response> {
    try {
      const table = await this.tableRepository.findBySlug(payload.slug);

      if (!table) {
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );
      }

      const errors: Record<string, string> = {};
      let modified = 0;

      for (const _id of payload.ids) {
        // Objeto novo por iteracao: execute() muta o payload recebido.
        const result = await this.updateUseCase.execute({
          ...payload.data,
          slug: payload.slug,
          _id,
          ...(payload.__actorUserId && {
            __actorUserId: payload.__actorUserId,
          }),
          ...(payload.__ownOnly && { __ownOnly: true }),
          __isOwner: payload.__isOwner,
          __isAdministrator: payload.__isAdministrator,
        });

        if (result.isRight()) {
          modified += 1;
        } else if (result.value.cause !== 'OWN_ROW_ONLY') {
          // Convidado contributor: registros de outros donos são ignorados
          // silenciosamente (escopo "apenas a sua"), não viram erro do lote.
          errors[_id] = result.value.cause;
        }
      }

      return right({
        modified,
        ...(Object.keys(errors).length > 0 && { errors }),
      });
    } catch (error) {
      console.error('[table-rows > bulk-update][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'BULK_UPDATE_ROWS_ERROR',
        ),
      );
    }
  }
}
