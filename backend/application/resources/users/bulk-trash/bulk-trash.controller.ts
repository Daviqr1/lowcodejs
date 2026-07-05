import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';

import { UserBulkTrashSchema } from './bulk-trash.schema';
import UserBulkTrashUseCase from './bulk-trash.use-case';
import { UserBulkTrashBodyValidator } from './bulk-trash.validator';

@Controller({
  route: '/users',
})
export default class {
  constructor(
    private readonly useCase: UserBulkTrashUseCase = getInstanceByToken(
      UserBulkTrashUseCase,
    ),
  ) {}

  @PATCH({
    url: '/bulk-trash',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USERS),
      ],
      schema: UserBulkTrashSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const body = UserBulkTrashBodyValidator.parse(request.body);

    if (!request.user) {
      return response.status(401).send({
        message: 'Autenticação necessária',
        code: 401,
        cause: 'AUTHENTICATION_REQUIRED',
      });
    }

    const result = await this.useCase.execute({
      ids: body.ids,
      actorId: request.user.sub,
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
