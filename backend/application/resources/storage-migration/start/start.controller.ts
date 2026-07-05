import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { E_ROLE } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { RoleMiddleware } from '@application/middlewares/role.middleware';

import { StorageMigrationStartSchema } from './start.schema';
import StorageMigrationStartUseCase from './start.use-case';
import { StorageMigrationStartValidator } from './start.validator';

@Controller({
  route: '/storage/migration',
})
export default class {
  constructor(
    private readonly useCase: StorageMigrationStartUseCase = getInstanceByToken(
      StorageMigrationStartUseCase,
    ),
  ) {}

  @POST({
    url: '/start',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        RoleMiddleware([E_ROLE.MASTER]),
      ],
      schema: StorageMigrationStartSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const payload = StorageMigrationStartValidator.parse(request.body ?? {});

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
