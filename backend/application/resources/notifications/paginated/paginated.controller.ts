import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';

import { NotificationPaginatedSchema } from './paginated.schema';
import NotificationPaginatedUseCase from './paginated.use-case';
import { NotificationPaginatedQueryValidator } from './paginated.validator';

@Controller({
  route: '/notifications',
})
export default class {
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

    if (result.isLeft()) {
      const error = result.value;
      return response.status(error.code).send({
        message: error.message,
        code: error.code,
        cause: error.cause,
        ...(error.errors && { errors: error.errors }),
      });
    }

    return response.status(200).send(result.value);
  }
}
