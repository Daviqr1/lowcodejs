import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { TableFieldSuggestSlugSchema } from './suggest-slug.schema';
import TableFieldSuggestSlugUseCase from './suggest-slug.use-case';
import {
  TableFieldSuggestSlugBodyValidator,
  TableFieldSuggestSlugParamsValidator,
} from './suggest-slug.validator';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: TableFieldSuggestSlugUseCase = getInstanceByToken(
      TableFieldSuggestSlugUseCase,
    ),
  ) {}

  @POST({
    url: '/:slug/fields/suggest-slug',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.CREATE_FIELD,
        }),
      ],
      schema: TableFieldSuggestSlugSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const payload = TableFieldSuggestSlugBodyValidator.parse(request.body);
    const params = TableFieldSuggestSlugParamsValidator.parse(request.params);

    const result = await this.useCase.execute({
      name: payload.name,
      tableSlug: params.slug,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
