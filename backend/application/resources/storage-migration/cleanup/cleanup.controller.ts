import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { E_ROLE } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { RoleMiddleware } from '@application/middlewares/role.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { StorageMigrationCleanupSchema } from './cleanup.schema';
import StorageMigrationCleanupUseCase from './cleanup.use-case';
import { StorageMigrationCleanupValidator } from './cleanup.validator';

@Controller({
  route: '/storage/migration',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: StorageMigrationCleanupUseCase = getInstanceByToken(
      StorageMigrationCleanupUseCase,
    ),
  ) {}

  @POST({
    url: '/cleanup',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        RoleMiddleware([E_ROLE.MASTER]),
      ],
      schema: StorageMigrationCleanupSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const payload = StorageMigrationCleanupValidator.parse(request.body ?? {});

    const result = await this.useCase.execute(payload);

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(202).send({ data: result.value });
  }
}
