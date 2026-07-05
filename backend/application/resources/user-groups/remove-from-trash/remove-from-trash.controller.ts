import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';

import { UserGroupRemoveFromTrashSchema } from './remove-from-trash.schema';
import UserGroupRemoveFromTrashUseCase from './remove-from-trash.use-case';
import { UserGroupRemoveFromTrashParamValidator } from './remove-from-trash.validator';

@Controller({
  route: '/user-group',
})
export default class {
  constructor(
    private readonly useCase: UserGroupRemoveFromTrashUseCase = getInstanceByToken(
      UserGroupRemoveFromTrashUseCase,
    ),
  ) {}

  @PATCH({
    url: '/:_id/restore',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USER_GROUPS),
      ],
      schema: UserGroupRemoveFromTrashSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = UserGroupRemoveFromTrashParamValidator.parse(request.params);

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
