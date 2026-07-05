import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';

import { MenuSendToTrashSchema } from './send-to-trash.schema';
import MenuSendToTrashUseCase from './send-to-trash.use-case';
import { MenuSendToTrashParamValidator } from './send-to-trash.validator';

@Controller({
  route: '/menu',
})
export default class {
  constructor(
    private readonly useCase: MenuSendToTrashUseCase = getInstanceByToken(
      MenuSendToTrashUseCase,
    ),
  ) {}

  @PATCH({
    url: '/:_id/trash',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU),
      ],
      schema: MenuSendToTrashSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = MenuSendToTrashParamValidator.parse(request.params);

    const result = await this.useCase.execute(params);

    if (result.isLeft()) {
      const error = result.value;

      return response.status(error.code).send({
        message: error.message,
        code: error.code,
        cause: error.cause,
        ...(error.errors && { errors: error.errors }),
      });
    }

    return response.status(200).send(null);
  }
}
