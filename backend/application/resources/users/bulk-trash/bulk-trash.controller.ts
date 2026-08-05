import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { UserBulkIdsBodyValidator } from '../_shared.validator';

import { UserBulkTrashSchema } from './bulk-trash.schema';
import UserBulkTrashUseCase from './bulk-trash.use-case';

@Controller({
  route: '/users',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

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
    const body = UserBulkIdsBodyValidator.parse(request.body);

    if (!request.user) {
      return this.http.sendError(
        response,
        HTTPException.Unauthorized('Autenticação necessária'),
      );
    }

    const result = await this.useCase.execute({
      ids: body.ids,
      actorId: request.user.sub,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
