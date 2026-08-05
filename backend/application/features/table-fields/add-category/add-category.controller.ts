import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import {
  TableFieldAddCategoryBodyValidator,
  TableFieldParamsValidator,
} from '../_shared.validator';

import { TableFieldAddCategorySchema } from './add-category.schema';
import TableFieldAddCategoryUseCase from './add-category.use-case';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: TableFieldAddCategoryUseCase = getInstanceByToken(
      TableFieldAddCategoryUseCase,
    ),
  ) {}

  @POST({
    url: '/:slug/fields/:_id/category',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.UPDATE_FIELD,
        }),
      ],
      schema: TableFieldAddCategorySchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const payload = TableFieldAddCategoryBodyValidator.parse(request.body);
    const params = TableFieldParamsValidator.parse(request.params);

    const result = await this.useCase.execute({
      ...payload,
      ...params,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
