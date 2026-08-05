import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IGroup as Entity } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { UserGroupContractRepository } from '@application/repositories/user-group/user-group-contract.repository';

import type { UserGroupShowPayload } from '../_shared.validator';

type Response = Either<HTTPException, Entity>;
type Payload = UserGroupShowPayload;

@Service()
export default class UserGroupShowUseCase {
  constructor(
    private readonly userGroupRepository: UserGroupContractRepository,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const group = await this.userGroupRepository.findById(payload._id);

      if (!group)
        return left(
          HTTPException.NotFound(
            'Grupo de usuários não encontrado',
            'USER_GROUP_NOT_FOUND',
          ),
        );

      return right(group);
    } catch (error) {
      console.error('[user-groups > show][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'GET_USER_GROUP_BY_ID_ERROR',
        ),
      );
    }
  }
}
