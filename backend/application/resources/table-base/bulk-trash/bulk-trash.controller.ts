import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { BulkIdsBodyValidator } from '../_shared.validator';

import { BulkTrashSchema } from './bulk-trash.schema';
import BulkTrashUseCase from './bulk-trash.use-case';

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
    url: '/bulk-trash',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.REMOVE_TABLE,
        }),
      ],
      schema: BulkTrashSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const body = BulkIdsBodyValidator.parse(request.body);

    const result = await this.useCase.execute(body);

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
