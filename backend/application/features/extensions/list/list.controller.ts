import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { ExtensionListSchema } from './list.schema';
import ExtensionListUseCase from './list.use-case';

@Controller({
  route: '/extensions',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: ExtensionListUseCase = getInstanceByToken(
      ExtensionListUseCase,
    ),
  ) {}

  @GET({
    url: '',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_TOOLS),
      ],
      schema: ExtensionListSchema,
    },
  })
  async handle(
    _request: FastifyRequest,
    response: FastifyReply,
  ): Promise<void> {
    const result = await this.useCase.execute();

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
