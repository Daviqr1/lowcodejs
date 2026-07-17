import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, DELETE, getInstanceByToken } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';

import { UserEmptyTrashSchema } from './empty-trash.schema';
import UserEmptyTrashUseCase from './empty-trash.use-case';

@Controller({
  route: '/users',
})
export default class {
  constructor(
    private readonly useCase: UserEmptyTrashUseCase = getInstanceByToken(
      UserEmptyTrashUseCase,
    ),
  ) {}

  @DELETE({
    url: '/empty-trash',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USERS),
      ],
      schema: UserEmptyTrashSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const result = await this.useCase.execute();

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
