import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { TableFieldSendToTrashSchema } from './send-to-trash.schema';
import TableFieldSendToTrashUseCase from './send-to-trash.use-case';
import { TableFieldSendToTrashParamsValidator } from './send-to-trash.validator';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: TableFieldSendToTrashUseCase = getInstanceByToken(
      TableFieldSendToTrashUseCase,
    ),
  ) {}

  @PATCH({
    url: '/:slug/fields/:_id/trash',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.UPDATE_FIELD,
        }),
      ],
      schema: TableFieldSendToTrashSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = TableFieldSendToTrashParamsValidator.parse(request.params);

    const result = await this.useCase.execute({ ...params });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
