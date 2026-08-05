import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { TrashContractService } from '@application/services/trash/trash-contract.service';

import type { UserBulkTrashPayload } from '../_shared.validator';

type Response = Either<HTTPException, { modified: number }>;

@Service()
export default class UserBulkTrashUseCase {
  constructor(
    private readonly userRepository: UserContractRepository,
    private readonly trash: TrashContractService,
  ) {}

  async execute(payload: UserBulkTrashPayload): Promise<Response> {
    try {
      if (payload.ids.includes(payload.actorId)) {
        return left(
          HTTPException.Conflict(
            'Você não pode enviar a si mesmo para a lixeira',
            'CANNOT_TRASH_SELF',
          ),
        );
      }

      const modified = await this.trash.bulkTrash(
        this.userRepository,
        payload.ids,
      );

      return right({ modified });
    } catch (error) {
      console.error('[users > bulk-trash][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'BULK_TRASH_USERS_ERROR',
        ),
      );
    }
  }
}
