import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { MenuUpdateSchema } from './update.schema';
import MenuUpdateUseCase from './update.use-case';
import {
  MenuUpdateBodyValidator,
  MenuUpdateParamsValidator,
} from './update.validator';

@Controller()
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

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

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
