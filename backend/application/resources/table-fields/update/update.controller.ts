import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PUT } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { TableFieldUpdateSchema } from './update.schema';
import TableFieldUpdateUseCase from './update.use-case';
import {
  TableFieldUpdateBodyValidator,
  TableFieldUpdateParamsValidator,
} from './update.validator';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: TableFieldUpdateUseCase = getInstanceByToken(
      TableFieldUpdateUseCase,
    ),
  ) {}

  @PUT({
    url: '/:slug/fields/:_id',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.UPDATE_FIELD,
        }),
      ],
      schema: TableFieldUpdateSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const payload = TableFieldUpdateBodyValidator.parse(request.body);
    const params = TableFieldUpdateParamsValidator.parse(request.params);

    const result = await this.useCase.execute({
      ...payload,
      tableSlug: params.slug,
      _id: params._id,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
