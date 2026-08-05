import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import { SYSTEM_GROUP_SLUGS } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { UserGroupContractRepository } from '@application/repositories/user-group/user-group-contract.repository';

import type { UserGroupRemoveFromTrashPayload } from '../_shared.validator';

type Response = Either<HTTPException, null>;

@Service()
export default class UserGroupRemoveFromTrashUseCase {
  constructor(
    private readonly userGroupRepository: UserGroupContractRepository,
  ) {}

  async execute(payload: UserGroupRemoveFromTrashPayload): Promise<Response> {
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
            'Grupos do sistema não podem ser editados',
            'SYSTEM_GROUP_PROTECTED',
          ),
        );
      }

      if (!group.trashed) {
        return left(
          HTTPException.Conflict('Grupo não está na lixeira', 'NOT_TRASHED'),
        );
      }

      await this.userGroupRepository.update({
        _id: group._id,
        trashed: false,
        trashedAt: null,
      });

      return right(null);
    } catch (error) {
      console.error('[user-groups > remove-from-trash][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'REMOVE_GROUP_FROM_TRASH_ERROR',
        ),
      );
    }
  }
}
