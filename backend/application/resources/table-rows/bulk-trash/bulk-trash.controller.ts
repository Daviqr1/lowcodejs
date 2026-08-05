import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { BulkTrashSchema } from './bulk-trash.schema';
import BulkTrashUseCase from './bulk-trash.use-case';
import {
  BulkTrashBodyValidator,
  BulkTrashParamsValidator,
} from './bulk-trash.validator';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: BulkTrashUseCase = getInstanceByToken(
      BulkTrashUseCase,
    ),
  ) {}

  @PATCH({
    url: '/:slug/rows/bulk-trash',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.UPDATE_ROW,
        }),
      ],
      schema: BulkTrashSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = BulkTrashParamsValidator.parse(request.params);
    const body = BulkTrashBodyValidator.parse(request.body);

    const result = await this.useCase.execute({
      ...params,
      ...body,
      __actorUserId: request.user?.sub,
      __ownOnly: request.ownership?.ownOnly === true,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
