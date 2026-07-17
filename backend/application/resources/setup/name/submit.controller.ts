import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PUT } from 'fastify-decorators';

import { E_ROLE } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { RoleMiddleware } from '@application/middlewares/role.middleware';

import { SetupNameSubmitSchema } from './submit.schema';
import SetupNameSubmitUseCase from './submit.use-case';
import { SetupNameBodyValidator } from './submit.validator';

@Controller({
  route: '/setup',
})
export default class {
  constructor(
    private readonly useCase: SetupNameSubmitUseCase = getInstanceByToken(
      SetupNameSubmitUseCase,
    ),
  ) {}

  @PUT({
    url: '/step/name',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        RoleMiddleware([E_ROLE.MASTER]),
      ],
      schema: SetupNameSubmitSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const payload = SetupNameBodyValidator.parse(request.body);
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

    return response.status(200).send(result.value);
  }
}
