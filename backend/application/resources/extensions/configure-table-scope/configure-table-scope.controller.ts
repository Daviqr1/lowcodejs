import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

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
  private readonly http = getInstanceByToken(HttpResponseService);

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
        PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_PLUGINS),
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

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
