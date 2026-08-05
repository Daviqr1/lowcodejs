import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { GroupResolverContractService } from '@application/services/group-resolver/group-resolver-contract.service';

import type { UserSendToTrashPayload } from '../_shared.validator';

type Response = Either<HTTPException, null>;

@Service()
export default class UserSendToTrashUseCase {
  constructor(
    private readonly userRepository: UserContractRepository,
    private readonly groupResolver: GroupResolverContractService,
  ) {}

  async execute(payload: UserSendToTrashPayload): Promise<Response> {
    try {
      if (payload._id === payload.actorId) {
        return left(
          HTTPException.Conflict(
            'Você não pode enviar a si mesmo para a lixeira',
            'CANNOT_TRASH_SELF',
          ),
        );
      }

      const user = await this.userRepository.findById(payload._id);

      if (!user) {
        // `findById` ja filtra a lixeira; so buscamos o doc trashado para
        // distinguir "ja esta na lixeira" (409) de "nao existe" (404).
        const trashedUser = await this.userRepository.findById(payload._id, {
          trashed: true,
        });

        if (trashedUser) {
          return left(
            HTTPException.Conflict(
              'Usuário já está na lixeira',
              'ALREADY_TRASHED',
            ),
          );
        }

        return left(
          HTTPException.NotFound('Usuário não encontrado', 'USER_NOT_FOUND'),
        );
      }

      // Privilegio MASTER pelo fecho de grupos (nao pelo role do JWT): so um
      // MASTER pode triturar outro MASTER.
      const targetIsMaster = await this.groupResolver.isMaster(user);
      if (targetIsMaster) {
        const actor = await this.userRepository.findById(payload.actorId);
        const actorIsMaster = await this.groupResolver.isMaster(actor);
        if (!actorIsMaster) {
          return left(
            HTTPException.Forbidden(
              'Apenas MASTER pode enviar outro MASTER para a lixeira',
              'CANNOT_TRASH_MASTER',
            ),
          );
        }
      }

      await this.userRepository.update({
        _id: user._id,
        trashed: true,
        trashedAt: new Date(),
      });

      return right(null);
    } catch (error) {
      console.error('[users > send-to-trash][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'SEND_USER_TO_TRASH_ERROR',
        ),
      );
    }
  }
}
