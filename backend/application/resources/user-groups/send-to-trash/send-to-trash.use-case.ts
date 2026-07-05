import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import { SYSTEM_GROUP_SLUGS } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { UserGroupContractRepository } from '@application/repositories/user-group/user-group-contract.repository';

import type { UserGroupSendToTrashPayload } from './send-to-trash.validator';

type Response = Either<HTTPException, null>;

@Service()
export default class UserGroupSendToTrashUseCase {
  constructor(
    private readonly userGroupRepository: UserGroupContractRepository,
    private readonly userRepository: UserContractRepository,
  ) {}

  async execute(payload: UserGroupSendToTrashPayload): Promise<Response> {
    try {
      const group = await this.userGroupRepository.findById(payload._id);

      if (!group) {
        return left(
          HTTPException.NotFound(
            'Grupo não encontrado',
            'USER_GROUP_NOT_FOUND',
          ),
        );
      }

      if (group.trashed) {
        return left(
          HTTPException.Conflict('Grupo já está na lixeira', 'ALREADY_TRASHED'),
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

      await this.userGroupRepository.update({
        _id: group._id,
        trashed: true,
        trashedAt: new Date(),
      });

      return right(null);
    } catch (error) {
      console.error('[user-groups > send-to-trash][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'SEND_GROUP_TO_TRASH_ERROR',
        ),
      );
    }
  }
}
