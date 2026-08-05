import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import HttpResponseService from '@application/services/http-response/http-response.service';

import { RequestCodeBodyValidator } from '../_shared.validator';

import { RequestCodeSchema } from './request-code.schema';
import RequestCodeUseCase from './request-code.use-case';

@Controller({
  route: 'authentication',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: RequestCodeUseCase = getInstanceByToken(
      RequestCodeUseCase,
    ),
  ) {}

  @POST({
    url: '/recovery/request-code',
    options: {
      schema: RequestCodeSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const body = RequestCodeBodyValidator.parse(request.body);

    const result = await this.useCase.execute(body);

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
