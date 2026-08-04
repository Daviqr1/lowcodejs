import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, DELETE, getInstanceByToken } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { UserBulkDeleteSchema } from './bulk-delete.schema';
import UserBulkDeleteUseCase from './bulk-delete.use-case';
import { UserBulkDeleteBodyValidator } from './bulk-delete.validator';

@Controller({
  route: '/users',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: UserBulkDeleteUseCase = getInstanceByToken(
      UserBulkDeleteUseCase,
    ),
  ) {}

  @DELETE({
    url: '/bulk-delete',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USERS),
      ],
      schema: UserBulkDeleteSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const body = UserBulkDeleteBodyValidator.parse(request.body);

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

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
