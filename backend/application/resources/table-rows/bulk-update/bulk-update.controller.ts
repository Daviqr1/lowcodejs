import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { BulkUpdateSchema } from './bulk-update.schema';
import BulkUpdateUseCase from './bulk-update.use-case';
import {
  BulkUpdateBodyValidator,
  BulkUpdateParamsValidator,
} from './bulk-update.validator';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: BulkUpdateUseCase = getInstanceByToken(
      BulkUpdateUseCase,
    ),
  ) {}

  @PATCH({
    url: '/:slug/rows/bulk-update',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.UPDATE_ROW,
        }),
      ],
      schema: BulkUpdateSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = BulkUpdateParamsValidator.parse(request.params);
    const body = BulkUpdateBodyValidator.parse(request.body);

    const result = await this.useCase.execute({
      ...params,
      ...body,
      ...(request?.user?.sub && { __actorUserId: request.user.sub }),
      ...(request.ownership?.ownOnly && { __ownOnly: true }),
      __isOwner: request.ownership?.isOwner,
      __isAdministrator: request.ownership?.isAdministrator,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
