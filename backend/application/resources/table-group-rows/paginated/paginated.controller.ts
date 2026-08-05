import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { GroupRowPaginatedSchema } from './paginated.schema';
import GroupRowPaginatedUseCase from './paginated.use-case';
import {
  GroupRowPaginatedParamsValidator,
  GroupRowPaginatedQueryValidator,
} from './paginated.validator';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: GroupRowPaginatedUseCase = getInstanceByToken(
      GroupRowPaginatedUseCase,
    ),
  ) {}

  @GET({
    url: '/:slug/rows/:rowId/groups/:groupSlug/paginated',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.VIEW_ROW,
        }),
      ],
      schema: GroupRowPaginatedSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = GroupRowPaginatedParamsValidator.parse(request.params);
    const query = GroupRowPaginatedQueryValidator.parse(request.query);

    const result = await this.useCase.execute({
      ...params,
      ...query,
      __actorUserId: request.user?.sub,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
