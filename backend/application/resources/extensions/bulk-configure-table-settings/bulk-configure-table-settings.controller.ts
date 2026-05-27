/* eslint-disable no-unused-vars */
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_ROLE } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { RoleMiddleware } from '@application/middlewares/role.middleware';

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
        RoleMiddleware([E_ROLE.MASTER]),
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
      tableIds: body.tableIds,
      settings: body.settings,
      expectedUpdatedAt: new Date(body.expectedUpdatedAt),
    });

    if (result.isLeft()) {
      const error = result.value;
      return response.status(error.code).send({
        message: error.message,
        code: error.code,
        cause: error.cause,
        ...(error.errors && { errors: error.errors }),
      });
    }

    return response.status(200).send(result.value);
  }
}
