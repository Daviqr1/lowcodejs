import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import HttpResponseService from '@application/services/http-response/http-response.service';

import { SettingPublicSchema } from './public.schema';
import SettingPublicUseCase from './public.use-case';

@Controller({
  route: '/setting',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: SettingPublicUseCase = getInstanceByToken(
      SettingPublicUseCase,
    ),
  ) {}

  @GET({
    url: '/public',
    options: {
      schema: SettingPublicSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const result = await this.useCase.execute();

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.send(result.value);
  }
}
