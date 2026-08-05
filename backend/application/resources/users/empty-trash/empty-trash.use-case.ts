import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { TrashContractService } from '@application/services/trash/trash-contract.service';

type Response = Either<HTTPException, { deleted: number }>;

@Service()
export default class UserEmptyTrashUseCase {
  constructor(
    private readonly userRepository: UserContractRepository,
    private readonly tableRepository: TableContractRepository,
    private readonly trash: TrashContractService,
  ) {}

  async execute(): Promise<Response> {
    try {
      const deleted = await this.trash.emptyTrash(
        this.userRepository,
        async (user) => {
          const owned = await this.tableRepository.count({
            owner: [user._id],
          });

          return owned === 0;
        },
      );

      return right({ deleted });
    } catch (error) {
      console.error('[users > empty-trash][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'EMPTY_TRASH_USERS_ERROR',
        ),
      );
    }
  }
}
