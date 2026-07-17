import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';

import { UserGroupPaginatedSchema } from './paginated.schema';
import UserGroupPaginatedUseCase from './paginated.use-case';
import { UserGroupPaginatedQueryValidator } from './paginated.validator';

@Controller({
  route: 'user-group',
})
export default class {
  constructor(
    private readonly useCase: UserGroupPaginatedUseCase = getInstanceByToken(
      UserGroupPaginatedUseCase,
    ),
  ) {}

  @GET({
    url: '/paginated',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USER_GROUPS),
      ],
      schema: UserGroupPaginatedSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const query = UserGroupPaginatedQueryValidator.parse(request.query);

    const result = await this.useCase.execute({
      ...query,
      user: {
        _id: request?.user?.sub,
        role: request?.user?.role,
      },
    });

    if (result.isLeft()) {
      const error = result.value;

      return response.status(error.code).send({
        message: error.message,
        code: error.code,
        cause: error.cause,
        ...(error.errors && { errors: error.errors }),
      });
    }

    return response.status(200).send(result.value);
  }
}
