import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';

import { MenuUpdateSchema } from './update.schema';
import MenuUpdateUseCase from './update.use-case';
import {
  MenuUpdateBodyValidator,
  MenuUpdateParamsValidator,
} from './update.validator';

@Controller()
export default class {
  constructor(
    private readonly useCase: MenuUpdateUseCase = getInstanceByToken(
      MenuUpdateUseCase,
    ),
  ) {}

  @PATCH({
    url: '/menu/:_id',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU),
      ],
      schema: MenuUpdateSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = MenuUpdateParamsValidator.parse(request.params);
    const body = MenuUpdateBodyValidator.parse(request.body);

    const result = await this.useCase.execute({
      ...params,
      ...body,
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
