import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { MenuRemoveFromTrashSchema } from './remove-from-trash.schema';
import MenuRemoveFromTrashUseCase from './remove-from-trash.use-case';
import { MenuRemoveFromTrashParamValidator } from './remove-from-trash.validator';

@Controller({
  route: '/menu',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: MenuRemoveFromTrashUseCase = getInstanceByToken(
      MenuRemoveFromTrashUseCase,
    ),
  ) {}

  @PATCH({
    url: '/:_id/restore',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU),
      ],
      schema: MenuRemoveFromTrashSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = MenuRemoveFromTrashParamValidator.parse(request.params);

    const result = await this.useCase.execute(params);

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(null);
  }
}
