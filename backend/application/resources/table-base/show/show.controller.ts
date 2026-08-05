import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { TableSlugParamsValidator } from '../_shared.validator';

import { TableShowSchema } from './show.schema';
import TableShowUseCase from './show.use-case';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: TableShowUseCase = getInstanceByToken(
      TableShowUseCase,
    ),
  ) {}

  @GET({
    url: '/:slug',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: true,
        }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.VIEW_TABLE,
        }),
      ],
      schema: TableShowSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = TableSlugParamsValidator.parse(request.params);

    const result = await this.useCase.execute({
      ...params,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
