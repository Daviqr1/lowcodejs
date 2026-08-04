import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { ExtensionActiveListSchema } from './active.schema';
import ExtensionActiveListUseCase from './active.use-case';

@Controller({
  route: '/extensions',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: ExtensionActiveListUseCase = getInstanceByToken(
      ExtensionActiveListUseCase,
    ),
  ) {}

  @GET({
    url: '/active',
    options: {
      onRequest: [AuthenticationMiddleware({ optional: false })],
      schema: ExtensionActiveListSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const result = await this.useCase.execute({ role: request.user.role });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
