import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { MenuCreateSchema } from './create.schema';
import MenuCreateUseCase from './create.use-case';
import { MenuCreateBodyValidator } from './create.validator';

@Controller()
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: MenuCreateUseCase = getInstanceByToken(
      MenuCreateUseCase,
    ),
  ) {}

  @POST({
    url: '/menu',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU),
      ],
      schema: MenuCreateSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const body = MenuCreateBodyValidator.parse(request.body);

    const result = await this.useCase.execute({
      ...body,
      owner: request.user.sub,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(201).send(result.value);
  }
}
