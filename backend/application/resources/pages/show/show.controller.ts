import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { PageShowSchema } from './show.schema';
import PageShowUseCase from './show.use-case';
import { PageShowParamsValidator } from './show.validator';

@Controller({
  route: '/pages',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: PageShowUseCase = getInstanceByToken(
      PageShowUseCase,
    ),
  ) {}

  @GET({
    url: '/:slug',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
      ],
      schema: PageShowSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = PageShowParamsValidator.parse(request.params);
    const result = await this.useCase.execute({
      ...params,
      actorUserId: request.user?.sub,
      role: request.user?.role,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
