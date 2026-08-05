import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import {
  TableSlugParamsValidator,
  TableRowPaginatedQueryValidator,
} from '../_shared.validator';

import { TableRowPaginatedSchema } from './paginated.schema';
import TableRowPaginatedUseCase from './paginated.use-case';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: TableRowPaginatedUseCase = getInstanceByToken(
      TableRowPaginatedUseCase,
    ),
  ) {}

  @GET({
    url: '/:slug/rows/paginated',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: true,
        }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.VIEW_ROW,
        }),
      ],
      schema: TableRowPaginatedSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const query = TableRowPaginatedQueryValidator.parse(request.query);
    const params = TableSlugParamsValidator.parse(request.params);

    const result = await this.useCase.execute({
      ...query,
      ...params,
      user: request.user?.sub,
      isOwner: request.ownership?.isOwner,
      isAdministrator: request.ownership?.isAdministrator,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
