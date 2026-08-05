import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { GroupRowItemParamsValidator } from '../_shared.validator';

import { GroupRowShowSchema } from './show.schema';
import GroupRowShowUseCase from './show.use-case';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: GroupRowShowUseCase = getInstanceByToken(
      GroupRowShowUseCase,
    ),
  ) {}

  @GET({
    url: '/:slug/rows/:rowId/groups/:groupSlug/:itemId',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.VIEW_ROW,
        }),
      ],
      schema: GroupRowShowSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = GroupRowItemParamsValidator.parse(request.params);
    const result = await this.useCase.execute({
      ...params,
      __actorUserId: request.user?.sub,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
