/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';

import type { UserBulkUpdatePayload } from './bulk-update.validator';

type Response = Either<HTTPException, { modified: number }>;

@Service()
export default class UserBulkUpdateUseCase {
  constructor(private readonly userRepository: UserContractRepository) {}

  async execute(payload: UserBulkUpdatePayload): Promise<Response> {
    try {
      // Nunca altera o status do proprio usuario (evita auto-bloqueio ao
      // desativar a si mesmo, inclusive em "selecionar todos").
      const targetIds = payload.ids.filter((id) => id !== payload.actorId);

      if (targetIds.length === 0) {
        return right({ modified: 0 });
      }

      const modified = await this.userRepository.updateMany({
        _ids: targetIds,
        filterTrashed: false,
        data: { status: payload.status },
      });

      return right({ modified });
    } catch (error) {
      console.error('[users > bulk-update][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'BULK_UPDATE_USERS_ERROR',
        ),
      );
    }
  }
}
