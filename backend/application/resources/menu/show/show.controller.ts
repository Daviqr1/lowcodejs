import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { MenuShowSchema } from './show.schema';
import MenuShowUseCase from './show.use-case';
import { MenuShowParamValidator } from './show.validator';

@Controller({
  route: '/menu',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: MenuShowUseCase = getInstanceByToken(
      MenuShowUseCase,
    ),
  ) {}

  @GET({
    url: '/:_id',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU),
      ],
      schema: MenuShowSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = MenuShowParamValidator.parse(request.params);

    const result = await this.useCase.execute(params);

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
