import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, DELETE, getInstanceByToken } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';

import { MenuEmptyTrashSchema } from './empty-trash.schema';
import MenuEmptyTrashUseCase from './empty-trash.use-case';

@Controller({
  route: '/menu',
})
export default class {
  constructor(
    private readonly useCase: MenuEmptyTrashUseCase = getInstanceByToken(
      MenuEmptyTrashUseCase,
    ),
  ) {}

  @DELETE({
    url: '/empty-trash',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU),
      ],
      schema: MenuEmptyTrashSchema,
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
