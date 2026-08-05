import { Service } from 'fastify-decorators';

import { left, right, type Either } from '@application/core/either.core';
import {
  E_USER_STATUS,
  type IUser as Entity,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';

import type { RefreshTokenPayload } from '../_shared.validator';

type Response = Either<HTTPException, Entity>;
type Payload = RefreshTokenPayload;

@Service()
export default class RefreshTokenUseCase {
  constructor(private readonly userRepository: UserContractRepository) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const user = await this.userRepository.findById(payload._id);

      if (!user)
        return left(
          HTTPException.NotFound('Usuário não encontrado', 'USER_NOT_FOUND'),
        );

      // Sem esta guarda um usuario desativado renovava a sessao por 7 dias.
      if (user.status !== E_USER_STATUS.ACTIVE)
        return left(
          HTTPException.Unauthorized('Usuário inativo', 'USER_INACTIVE'),
        );

      // Refresh emitido antes da troca de senha nao vale mais — senao ele
      // trocaria por um access token novo e a revogacao seria inutil.
      if ((user.sessionVersion ?? 0) !== (payload.sessionVersion ?? 0))
        return left(
          HTTPException.Unauthorized('Sessão expirada', 'SESSION_REVOKED'),
        );

      return right(user);
    } catch (error) {
      console.error('[authentication > refresh-token][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'REFRESH_TOKEN_ERROR',
        ),
      );
    }
  }
}
