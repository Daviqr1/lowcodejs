import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';

import { PageShowSchema } from './show.schema';
import PageShowUseCase from './show.use-case';
import { PageShowParamsValidator } from './show.validator';

@Controller({
  route: '/pages',
})
export default class {
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
      ...(request.user?.sub && { actorUserId: request.user.sub }),
      ...(request.user?.role && { role: request.user.role }),
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
