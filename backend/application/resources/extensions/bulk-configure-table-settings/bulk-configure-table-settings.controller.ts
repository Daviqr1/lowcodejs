import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { BulkConfigureTableSettingsSchema } from './bulk-configure-table-settings.schema';
import BulkConfigureTableSettingsUseCase from './bulk-configure-table-settings.use-case';
import {
  BulkConfigureTableSettingsBodyValidator,
  BulkConfigureTableSettingsParamsValidator,
} from './bulk-configure-table-settings.validator';

@Controller({
  route: '/extensions',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: BulkConfigureTableSettingsUseCase = getInstanceByToken(
      BulkConfigureTableSettingsUseCase,
    ),
  ) {}

  @PATCH({
    url: '/:_id/bulk-table-settings',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_PLUGINS),
      ],
      schema: BulkConfigureTableSettingsSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const { _id } = BulkConfigureTableSettingsParamsValidator.parse(
      request.params,
    );
    const body = BulkConfigureTableSettingsBodyValidator.parse(request.body);

    const result = await this.useCase.execute({
      _id,
      tableSettings: body.tableSettings,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
