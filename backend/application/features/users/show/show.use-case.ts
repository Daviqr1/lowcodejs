import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import type { UserResponse } from '@application/services/user-mapper/user-mapper-contract.service';
import { UserMapperContractService } from '@application/services/user-mapper/user-mapper-contract.service';

import type { UserShowPayload } from '../_shared.validator';

type Response = Either<HTTPException, UserResponse>;
type Payload = UserShowPayload;

@Service()
export default class UserShowUseCase {
  constructor(
    private readonly userRepository: UserContractRepository,
    private readonly userMapper: UserMapperContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const user = await this.userRepository.findById(payload._id);

      if (!user)
        return left(
          HTTPException.NotFound('Usuário não encontrado', 'USER_NOT_FOUND'),
        );

      return right(this.userMapper.toResponse(user));
    } catch (error) {
      console.error('[users > show][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'GET_USER_BY_ID_ERROR',
        ),
      );
    }
  }
}
