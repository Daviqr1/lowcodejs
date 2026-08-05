import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import HttpResponseService from '@application/services/http-response/http-response.service';

import { SetupStatusSchema } from './status.schema';
import SetupStatusUseCase from './status.use-case';

@Controller({
  route: '/setup',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: SetupStatusUseCase = getInstanceByToken(
      SetupStatusUseCase,
    ),
  ) {}

  @GET({
    url: '/status',
    options: {
      schema: SetupStatusSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const result = await this.useCase.execute();

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.send(result.value);
  }
}
