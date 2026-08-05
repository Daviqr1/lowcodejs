import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { TableRowSendToTrashSchema } from './send-to-trash.schema';
import TableRowSendToTrashUseCase from './send-to-trash.use-case';
import { TableRowSendToTrashParamsValidator } from './send-to-trash.validator';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: TableRowSendToTrashUseCase = getInstanceByToken(
      TableRowSendToTrashUseCase,
    ),
  ) {}

  @PATCH({
    url: '/:slug/rows/:_id/trash',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.UPDATE_ROW,
        }),
      ],
      schema: TableRowSendToTrashSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = TableRowSendToTrashParamsValidator.parse(request.params);

    const result = await this.useCase.execute({
      ...params,
      __actorUserId: request.user?.sub,
      __ownOnly: request.ownership?.ownOnly === true,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
