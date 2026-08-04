import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, DELETE, getInstanceByToken } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { UserGroupDeleteSchema } from './delete.schema';
import UserGroupDeleteUseCase from './delete.use-case';
import { UserGroupDeleteParamValidator } from './delete.validator';

@Controller({
  route: '/user-group',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: UserGroupDeleteUseCase = getInstanceByToken(
      UserGroupDeleteUseCase,
    ),
  ) {}

  @DELETE({
    url: '/:_id',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USER_GROUPS),
      ],
      schema: UserGroupDeleteSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = UserGroupDeleteParamValidator.parse(request.params);

    const result = await this.useCase.execute(params);

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(null);
  }
}
