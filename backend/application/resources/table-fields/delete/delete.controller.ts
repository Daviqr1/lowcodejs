import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, DELETE, getInstanceByToken } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { TableFieldDeleteSchema } from './delete.schema';
import TableFieldDeleteUseCase from './delete.use-case';
import {
  TableFieldDeleteParamsValidator,
  TableFieldDeleteQueryValidator,
} from './delete.validator';

@Controller({
  route: 'tables',
})
export default class TableFieldDeleteController {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: TableFieldDeleteUseCase = getInstanceByToken(
      TableFieldDeleteUseCase,
    ),
  ) {}

  @DELETE({
    url: '/:slug/fields/:_id',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.REMOVE_FIELD,
        }),
      ],
      schema: TableFieldDeleteSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = TableFieldDeleteParamsValidator.parse(request.params);
    const query = TableFieldDeleteQueryValidator.parse(request.query);
    const result = await this.useCase.execute({ ...params, ...query });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(null);
  }
}
