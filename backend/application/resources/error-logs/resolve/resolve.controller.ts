/* eslint-disable no-unused-vars */
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_ROLE } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { RoleMiddleware } from '@application/middlewares/role.middleware';

import ErrorLogResolveUseCase from './resolve.use-case';
import {
  ErrorLogResolveBodyValidator,
  ErrorLogResolveParamsValidator,
} from './resolve.validator';

@Controller({
  route: '/error-logs',
})
export default class {
  constructor(
    private readonly useCase: ErrorLogResolveUseCase = getInstanceByToken(
      ErrorLogResolveUseCase,
    ),
  ) {}

  @PATCH({
    url: '/:id/resolve',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        RoleMiddleware([E_ROLE.MASTER, E_ROLE.ADMINISTRATOR]),
      ],
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const { id } = ErrorLogResolveParamsValidator.parse(request.params);
    const { resolved } = ErrorLogResolveBodyValidator.parse(request.body);

    const result = await this.useCase.execute({ id, resolved });

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
