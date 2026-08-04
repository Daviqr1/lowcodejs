import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { NotificationPaginatedSchema } from './paginated.schema';
import NotificationPaginatedUseCase from './paginated.use-case';
import { NotificationPaginatedQueryValidator } from './paginated.validator';

@Controller({
  route: '/notifications',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: NotificationPaginatedUseCase = getInstanceByToken(
      NotificationPaginatedUseCase,
    ),
  ) {}

  @GET({
    url: '/paginated',
    options: {
      onRequest: [AuthenticationMiddleware({ optional: false })],
      schema: NotificationPaginatedSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const query = NotificationPaginatedQueryValidator.parse(request.query);

    const result = await this.useCase.execute({
      ...query,
      userId: request.user.sub,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
