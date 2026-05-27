/* eslint-disable no-unused-vars */
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_ROLE } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { RoleMiddleware } from '@application/middlewares/role.middleware';

import { ConfigureTableSettingsSchema } from './configure-table-settings.schema';
import ExtensionConfigureTableSettingsUseCase from './configure-table-settings.use-case';
import {
  ConfigureTableSettingsBodyValidator,
  ConfigureTableSettingsParamsValidator,
} from './configure-table-settings.validator';

@Controller({
  route: '/extensions',
})
export default class {
  constructor(
    private readonly useCase: ExtensionConfigureTableSettingsUseCase = getInstanceByToken(
      ExtensionConfigureTableSettingsUseCase,
    ),
  ) {}

  @PATCH({
    url: '/:_id/table-settings/:tableId',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        RoleMiddleware([E_ROLE.MASTER]),
      ],
      schema: ConfigureTableSettingsSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const { _id, tableId } = ConfigureTableSettingsParamsValidator.parse(
      request.params,
    );
    const body = ConfigureTableSettingsBodyValidator.parse(request.body);

    const result = await this.useCase.execute({
      _id,
      tableId,
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
