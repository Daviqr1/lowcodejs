import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IUser, Merge } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { GroupResolverContractService } from '@application/services/group-resolver/group-resolver-contract.service';

// Perfil acrescido das capacidades resolvidas pelo fecho de grupos do usuario
// (uniao das permissoes de `{group} ∪ groups` seguindo `encompasses`). O
// frontend usa isso para liberar a navegacao por capability, nao por role.
type ProfileWithCapabilities = Merge<IUser, { capabilities: string[] }>;

type Response = Either<HTTPException, ProfileWithCapabilities>;
type Payload = { _id: string };

@Service()
export default class ProfileShowUseCase {
  constructor(
    private readonly userRepository: UserContractRepository,
    private readonly groupResolver: GroupResolverContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const user = await this.userRepository.findById(payload._id);

      if (!user)
        return left(
          HTTPException.NotFound('Usuário não encontrado', 'USER_NOT_FOUND'),
        );

      const capabilities = Array.from(
        await this.groupResolver.resolveCapabilities(user),
      );

      return right({ ...user, capabilities });
    } catch (error) {
      console.error('[profile > show][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'GET_USER_PROFILE_ERROR',
        ),
      );
    }
  }
}
