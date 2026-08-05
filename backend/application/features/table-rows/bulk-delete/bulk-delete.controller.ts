import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, DELETE, getInstanceByToken } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import {
  BulkIdsBodyValidator,
  TableSlugParamsValidator,
} from '../_shared.validator';

import { BulkDeleteSchema } from './bulk-delete.schema';
import BulkDeleteUseCase from './bulk-delete.use-case';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: BulkDeleteUseCase = getInstanceByToken(
      BulkDeleteUseCase,
    ),
  ) {}

  @DELETE({
    url: '/:slug/rows/bulk-delete',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.REMOVE_ROW,
        }),
      ],
      schema: BulkDeleteSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = TableSlugParamsValidator.parse(request.params);
    const body = BulkIdsBodyValidator.parse(request.body);

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
