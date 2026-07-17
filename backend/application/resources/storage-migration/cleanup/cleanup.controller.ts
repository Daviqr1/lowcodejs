import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { E_ROLE } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { RoleMiddleware } from '@application/middlewares/role.middleware';

import { StorageMigrationCleanupSchema } from './cleanup.schema';
import StorageMigrationCleanupUseCase from './cleanup.use-case';
import { StorageMigrationCleanupValidator } from './cleanup.validator';

@Controller({
  route: '/storage/migration',
})
export default class {
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

    if (result.isLeft()) {
      const error = result.value;
      return response.status(error.code).send({
        message: error.message,
        code: error.code,
        cause: error.cause,
        ...(error.errors && { errors: error.errors }),
      });
    }

    return response.status(202).send({ data: result.value });
  }
}
