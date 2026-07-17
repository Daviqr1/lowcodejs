import { Service } from 'fastify-decorators';
import slugify from 'slugify';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IGroup as Entity } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { UserGroupContractRepository } from '@application/repositories/user-group/user-group-contract.repository';

import type { UserGroupCreatePayload } from './create.validator';

type Response = Either<HTTPException, Entity>;
type Payload = UserGroupCreatePayload;

@Service()
export default class UserGroupCreateUseCase {
  constructor(
    private readonly userGroupRepository: UserGroupContractRepository,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const slug = slugify(payload.name, { trim: true, lower: true });

      const group = await this.userGroupRepository.findBySlug(slug);

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
