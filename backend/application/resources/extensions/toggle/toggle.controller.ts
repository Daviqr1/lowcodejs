/* eslint-disable no-unused-vars */
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_ROLE } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { RoleMiddleware } from '@application/middlewares/role.middleware';

import { ExtensionToggleSchema } from './toggle.schema';
import ExtensionToggleUseCase from './toggle.use-case';
import {
  ExtensionToggleBodyValidator,
  ExtensionToggleParamsValidator,
} from './toggle.validator';

@Controller({
  route: '/extensions',
})
export default class {
  constructor(
    private readonly useCase: ExtensionToggleUseCase = getInstanceByToken(
      ExtensionToggleUseCase,
    ),
  ) {}

  @PATCH({
    url: '/:_id/toggle',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        RoleMiddleware([E_ROLE.MASTER]),
      ],
      schema: ExtensionToggleSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const { _id } = ExtensionToggleParamsValidator.parse(request.params);
    const { enabled } = ExtensionToggleBodyValidator.parse(request.body);

    const result = await this.useCase.execute({ _id, enabled });

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
