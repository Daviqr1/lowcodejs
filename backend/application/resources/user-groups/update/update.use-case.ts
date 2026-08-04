import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import { SYSTEM_GROUP_SLUGS } from '@application/core/entity.core';
import type { IGroup as Entity } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { UserGroupContractRepository } from '@application/repositories/user-group/user-group-contract.repository';
import { GroupResolverContractService } from '@application/services/group-resolver/group-resolver-contract.service';

import type { UserGroupUpdatePayload } from './update.validator';

type Response = Either<HTTPException, Entity>;
type Payload = UserGroupUpdatePayload;

@Service()
export default class UserGroupUpdateUseCase {
  constructor(
    private readonly userGroupRepository: UserGroupContractRepository,
    private readonly groupResolver: GroupResolverContractService,
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

      if (SYSTEM_GROUP_SLUGS.has(group.slug))
        return left(
          HTTPException.Forbidden(
            'Grupos do sistema não podem ser editados',
            'SYSTEM_GROUP_PROTECTED',
          ),
        );

      if (payload.permissions && payload.permissions.length === 0)
        return left(
          HTTPException.BadRequest(
            'Ao menos uma permissão deve ser informada para o grupo de usuários',
            undefined,
            {
              permissions:
                'Ao menos uma permissão deve ser informada para o grupo de usuários',
            },
          ),
        );

      if (payload.encompasses && payload.encompasses.length > 0) {
        if (payload.encompasses.includes(group._id))
          return left(
            HTTPException.BadRequest(
              'Um grupo não pode englobar a si mesmo',
              'GROUP_SELF_REFERENCE',
              { encompasses: 'Um grupo não pode englobar a si mesmo' },
            ),
          );

        const groups = await this.userGroupRepository.findMany();

        if (this.groupResolver.hasCycle(group._id, payload.encompasses, groups))
          return left(
            HTTPException.BadRequest(
              'Hierarquia de grupos circular detectada',
              'GROUP_CYCLE_DETECTED',
              { encompasses: 'Hierarquia de grupos circular detectada' },
            ),
          );
      }

      const updated = await this.userGroupRepository.update(payload);

      return right(updated);
    } catch (error) {
      console.error('[user-groups > update][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'UPDATE_USER_GROUP_ERROR',
        ),
      );
    }
  }
}
