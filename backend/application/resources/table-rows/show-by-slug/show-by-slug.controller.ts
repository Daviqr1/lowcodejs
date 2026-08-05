import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { TableRowShowBySlugParamsValidator } from '../_shared.validator';

import { TableRowShowBySlugSchema } from './show-by-slug.schema';
import TableRowShowBySlugUseCase from './show-by-slug.use-case';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: TableRowShowBySlugUseCase = getInstanceByToken(
      TableRowShowBySlugUseCase,
    ),
  ) {}

  @GET({
    url: '/:slug/rows/by-slug/:rowSlug',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: true,
        }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.VIEW_ROW,
        }),
      ],
      schema: TableRowShowBySlugSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = TableRowShowBySlugParamsValidator.parse(request.params);
    const result = await this.useCase.execute({
      ...params,
      user: request.user?.sub,
      isOwner: request.ownership?.isOwner,
      isAdministrator: request.ownership?.isAdministrator,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    // Resolve o registro pelo slug amigavel e devolve o JSON. A navegacao
    // (abrir /tables/:slug/row?_id=...) fica a cargo do frontend, que pode ser
    // customizado por instalacao.
    return response.status(200).send(result.value);
  }
}

//
