import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';

import { UserBulkUpdateSchema } from './bulk-update.schema';
import UserBulkUpdateUseCase from './bulk-update.use-case';
import { UserBulkUpdateBodyValidator } from './bulk-update.validator';

@Controller({
  route: '/users',
})
export default class {
  constructor(
    private readonly useCase: UserBulkUpdateUseCase = getInstanceByToken(
      UserBulkUpdateUseCase,
    ),
  ) {}

  @PATCH({
    url: '/bulk-update',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USERS),
      ],
      schema: UserBulkUpdateSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const body = UserBulkUpdateBodyValidator.parse(request.body);

    if (!request.user) {
      return response.status(401).send({
        message: 'Autenticação necessária',
        code: 401,
        cause: 'AUTHENTICATION_REQUIRED',
      });
    }

    const result = await this.useCase.execute({
      ids: body.ids,
      status: body.status,
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
