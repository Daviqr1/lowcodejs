import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { UserBulkUpdateBodyValidator } from '../_shared.validator';

import { UserBulkUpdateSchema } from './bulk-update.schema';
import UserBulkUpdateUseCase from './bulk-update.use-case';

@Controller({
  route: '/users',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

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
      return this.http.sendError(
        response,
        HTTPException.Unauthorized('Autenticação necessária'),
      );
    }

    const result = await this.useCase.execute({
      ids: body.ids,
      status: body.status,
      actorId: request.user.sub,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
