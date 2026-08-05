import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { TrashContractService } from '@application/services/trash/trash-contract.service';

import type { UserBulkDeletePayload } from './bulk-delete.validator';

type Response = Either<HTTPException, { deleted: number }>;

@Service()
export default class UserBulkDeleteUseCase {
  constructor(
    private readonly userRepository: UserContractRepository,
    private readonly tableRepository: TableContractRepository,
    private readonly trash: TrashContractService,
  ) {}

  async execute(payload: UserBulkDeletePayload): Promise<Response> {
    try {
      if (payload.ids.includes(payload.actorId)) {
        return left(
          HTTPException.Conflict(
            'Você não pode excluir a si mesmo',
            'CANNOT_DELETE_SELF',
          ),
        );
      }

      const deleted = await this.trash.bulkDelete(
        this.userRepository,
        payload.ids,
        async (user) => {
          const owned = await this.tableRepository.count({
            owner: [user._id],
          });

          return owned === 0;
        },
      );

      return right({ deleted });
    } catch (error) {
      console.error('[users > bulk-delete][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'BULK_DELETE_USERS_ERROR',
        ),
      );
    }
  }
}
