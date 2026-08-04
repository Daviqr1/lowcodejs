import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, DELETE, getInstanceByToken } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { UserGroupBulkDeleteSchema } from './bulk-delete.schema';
import UserGroupBulkDeleteUseCase from './bulk-delete.use-case';
import { UserGroupBulkDeleteBodyValidator } from './bulk-delete.validator';

@Controller({
  route: '/user-group',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: UserGroupBulkDeleteUseCase = getInstanceByToken(
      UserGroupBulkDeleteUseCase,
    ),
  ) {}

  @DELETE({
    url: '/bulk-delete',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USER_GROUPS),
      ],
      schema: UserGroupBulkDeleteSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const body = UserGroupBulkDeleteBodyValidator.parse(request.body);

    const result = await this.useCase.execute(body);

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
