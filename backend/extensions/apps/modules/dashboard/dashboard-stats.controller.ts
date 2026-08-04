import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { E_EXTENSION_TYPE, E_ROLE } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { ExtensionActiveMiddleware } from '@application/middlewares/extension-active.middleware';
import { RoleMiddleware } from '@application/middlewares/role.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { DashboardStatsSchema } from './dashboard-stats.schema';
import DashboardStatsUseCase from './dashboard-stats.use-case';

@Controller({
  route: '/e/apps/dashboard',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: DashboardStatsUseCase = getInstanceByToken(
      DashboardStatsUseCase,
    ),
  ) {}

  @GET({
    url: '/stats',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        RoleMiddleware([E_ROLE.MASTER, E_ROLE.ADMINISTRATOR]),
        ExtensionActiveMiddleware({
          pkg: 'apps',
          type: E_EXTENSION_TYPE.MODULE,
          extensionId: 'dashboard',
        }),
      ],
      schema: DashboardStatsSchema,
    },
  })
  async handle(
    _request: FastifyRequest,
    response: FastifyReply,
  ): Promise<void> {
    const result = await this.useCase.execute();

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
