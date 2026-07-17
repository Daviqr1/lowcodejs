import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, DELETE, getInstanceByToken } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { EmptyTrashSchema } from './empty-trash.schema';
import EmptyTrashUseCase from './empty-trash.use-case';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    private readonly useCase: EmptyTrashUseCase = getInstanceByToken(
      EmptyTrashUseCase,
    ),
  ) {}

  @DELETE({
    url: '/empty-trash',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'REMOVE_TABLE',
        }),
      ],
      schema: EmptyTrashSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const result = await this.useCase.execute();

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
