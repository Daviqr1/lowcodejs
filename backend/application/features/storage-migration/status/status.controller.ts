import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { E_ROLE } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { RoleMiddleware } from '@application/middlewares/role.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { StorageMigrationStatusSchema } from './status.schema';
import StorageMigrationStatusUseCase from './status.use-case';

@Controller({
  route: '/storage/migration',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: StorageMigrationStatusUseCase = getInstanceByToken(
      StorageMigrationStatusUseCase,
    ),
  ) {}

  @GET({
    url: '/status',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        RoleMiddleware([E_ROLE.MASTER]),
      ],
      schema: StorageMigrationStatusSchema,
    },
  })
  async handle(
    _request: FastifyRequest,
    response: FastifyReply,
  ): Promise<void> {
    const result = await this.useCase.execute();

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send({ data: result.value });
  }
}
