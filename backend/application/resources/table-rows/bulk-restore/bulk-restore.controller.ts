import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { BulkRestoreSchema } from './bulk-restore.schema';
import BulkRestoreUseCase from './bulk-restore.use-case';
import {
  BulkRestoreBodyValidator,
  BulkRestoreParamsValidator,
} from './bulk-restore.validator';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: BulkRestoreUseCase = getInstanceByToken(
      BulkRestoreUseCase,
    ),
  ) {}

  @PATCH({
    url: '/:slug/rows/bulk-restore',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.UPDATE_ROW,
        }),
      ],
      schema: BulkRestoreSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = BulkRestoreParamsValidator.parse(request.params);
    const body = BulkRestoreBodyValidator.parse(request.body);

    const result = await this.useCase.execute({
      ...params,
      ...body,
      ...(request?.user?.sub && { __actorUserId: request.user.sub }),
      ...(request.ownership?.ownOnly && { __ownOnly: true }),
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
