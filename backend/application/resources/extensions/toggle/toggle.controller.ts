import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

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
  private readonly http = getInstanceByToken(HttpResponseService);

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
        PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_TOOLS),
      ],
      schema: ExtensionToggleSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const { _id } = ExtensionToggleParamsValidator.parse(request.params);
    const { enabled } = ExtensionToggleBodyValidator.parse(request.body);

    const result = await this.useCase.execute({ _id, enabled });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
