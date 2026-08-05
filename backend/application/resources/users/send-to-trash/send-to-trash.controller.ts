import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { UserSendToTrashSchema } from './send-to-trash.schema';
import UserSendToTrashUseCase from './send-to-trash.use-case';
import { UserSendToTrashParamValidator } from './send-to-trash.validator';

@Controller({
  route: '/users',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: UserSendToTrashUseCase = getInstanceByToken(
      UserSendToTrashUseCase,
    ),
  ) {}

  @PATCH({
    url: '/:_id/trash',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USERS),
      ],
      schema: UserSendToTrashSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = UserSendToTrashParamValidator.parse(request.params);

    if (!request.user) {
      return this.http.sendError(
        response,
        HTTPException.Unauthorized('Autenticação necessária'),
      );
    }

    const result = await this.useCase.execute({
      _id: params._id,
      actorId: request.user.sub,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
