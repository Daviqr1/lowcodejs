import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';

import { MenuListSchema } from './list.schema';
import MenuPaginatedUseCase from './list.use-case';

@Controller({
  route: '/menu',
})
export default class {
  constructor(
    private readonly useCase: MenuPaginatedUseCase = getInstanceByToken(
      MenuPaginatedUseCase,
    ),
  ) {}

  @GET({
    url: '',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
      ],
      schema: MenuListSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const result = await this.useCase.execute({
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
