/* eslint-disable no-unused-vars */
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_ROLE } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { RoleMiddleware } from '@application/middlewares/role.middleware';

import { ExtensionConfigureTableScopeSchema } from './configure-table-scope.schema';
import ExtensionConfigureTableScopeUseCase from './configure-table-scope.use-case';
import {
  ExtensionConfigureTableScopeBodyValidator,
  ExtensionConfigureTableScopeParamsValidator,
} from './configure-table-scope.validator';

@Controller({
  route: '/extensions',
})
export default class {
  constructor(
    private readonly useCase: ExtensionConfigureTableScopeUseCase = getInstanceByToken(
      ExtensionConfigureTableScopeUseCase,
    ),
  ) {}

  @PATCH({
    url: '/:_id/table-scope',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        RoleMiddleware([E_ROLE.MASTER]),
      ],
      schema: ExtensionConfigureTableScopeSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const { _id } = ExtensionConfigureTableScopeParamsValidator.parse(
      request.params,
    );
    const body = ExtensionConfigureTableScopeBodyValidator.parse(request.body);

    const result = await this.useCase.execute({
      _id,
      tableScope: { mode: body.mode, tableIds: body.tableIds },
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
