import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, DELETE, getInstanceByToken } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { GroupRowDeleteSchema } from './delete.schema';
import GroupRowDeleteUseCase from './delete.use-case';
import { GroupRowDeleteParamsValidator } from './delete.validator';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: GroupRowDeleteUseCase = getInstanceByToken(
      GroupRowDeleteUseCase,
    ),
  ) {}

  @DELETE({
    url: '/:slug/rows/:rowId/groups/:groupSlug/:itemId',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.REMOVE_ROW,
        }),
      ],
      schema: GroupRowDeleteSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = GroupRowDeleteParamsValidator.parse(request.params);
    const result = await this.useCase.execute({
      ...params,
      __actorUserId: request.user?.sub,
      __ownOnly: request.ownership?.ownOnly === true,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(null);
  }
}
