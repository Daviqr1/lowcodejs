import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import {
  TableFieldCreateBodyValidator,
  TableSlugParamsValidator,
} from '../_shared.validator';

import { TableFieldCreateSchema } from './create.schema';
import TableFieldCreateUseCase from './create.use-case';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: TableFieldCreateUseCase = getInstanceByToken(
      TableFieldCreateUseCase,
    ),
  ) {}

  @POST({
    url: '/:slug/fields',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.CREATE_FIELD,
        }),
      ],
      schema: TableFieldCreateSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const payload = TableFieldCreateBodyValidator.parse(request.body);
    const params = TableSlugParamsValidator.parse(request.params);
    const result = await this.useCase.execute({
      ...payload,
      tableSlug: params.slug,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(201).send(result.value);
  }
}
