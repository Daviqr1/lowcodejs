import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import {
  SYSTEM_GROUP_SLUGS,
  type IGroup as Entity,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { UserGroupContractRepository } from '@application/repositories/user-group/user-group-contract.repository';
import { SlugContractService } from '@application/services/slug/slug-contract.service';

import type { UserGroupCreatePayload } from './create.validator';

type Response = Either<HTTPException, Entity>;
type Payload = UserGroupCreatePayload;

@Service()
export default class UserGroupCreateUseCase {
  constructor(
    private readonly userGroupRepository: UserGroupContractRepository,
    private readonly slugService: SlugContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const slug = this.slugService.normalize(payload.name);

      // Os grupos de sistema usam slug MAIUSCULO, entao um grupo chamado
      // "Master" gerava `master` e nao colidia no `findBySlug` — mas
      // `isPrivileged` comparava em maiusculo e o tratava como privilegiado.
      if (SYSTEM_GROUP_SLUGS.has(slug.toUpperCase()))
        return left(
          HTTPException.Conflict(
            'Nome reservado para um grupo de sistema',
            'SYSTEM_GROUP_PROTECTED',
            { name: 'Nome reservado para um grupo de sistema' },
          ),
        );

      const group = await this.userGroupRepository.findBySlug(slug, {
        // Unicidade vale tambem contra grupos na lixeira: restaurar um deles
        // criaria slug duplicado.
        includeTrashed: true,
      });

      if (group)
        return left(
          HTTPException.Conflict('Grupo já existe', 'GROUP_EXISTS', {
            name: 'Grupo já existe',
          }),
        );

      if (!(payload?.permissions?.length > 0))
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

      const created = await this.userGroupRepository.create({
        ...payload,
        slug,
      });

      return right(created);
    } catch (error) {
      console.error('[user-groups > create][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'CREATE_USER_GROUP_ERROR',
        ),
      );
    }
  }
}
