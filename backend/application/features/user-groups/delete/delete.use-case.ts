import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import { SYSTEM_GROUP_SLUGS } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { UserGroupContractRepository } from '@application/repositories/user-group/user-group-contract.repository';

import type { UserGroupDeletePayload } from '../_shared.validator';

type Response = Either<HTTPException, null>;

@Service()
export default class UserGroupDeleteUseCase {
  constructor(
    private readonly userGroupRepository: UserGroupContractRepository,
    private readonly userRepository: UserContractRepository,
  ) {}

  async execute(payload: UserGroupDeletePayload): Promise<Response> {
    try {
      const group = await this.userGroupRepository.findById(payload._id, {
        trashed: true,
      });

      if (!group) {
        return left(
          HTTPException.NotFound(
            'Grupo não encontrado',
            'USER_GROUP_NOT_FOUND',
          ),
        );
      }

      if (SYSTEM_GROUP_SLUGS.has(group.slug)) {
        return left(
          HTTPException.Forbidden(
            'Grupos do sistema não podem ser excluídos',
            'SYSTEM_GROUP_PROTECTED',
          ),
        );
      }

      if (!group.trashed) {
        return left(
          HTTPException.Conflict('Grupo não está na lixeira', 'NOT_TRASHED'),
        );
      }

      const usersInGroup = await this.userRepository.count({
        group: group._id,
      });

      if (usersInGroup > 0) {
        return left(
          HTTPException.Conflict(
            'Grupo possui usuários atribuídos',
            'GROUP_HAS_USERS',
          ),
        );
      }

      await this.userGroupRepository.delete(group._id);

      return right(null);
    } catch (error) {
      console.error('[user-groups > delete][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'DELETE_GROUP_ERROR',
        ),
      );
    }
  }
}
