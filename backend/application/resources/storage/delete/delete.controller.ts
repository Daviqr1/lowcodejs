import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, DELETE, getInstanceByToken } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';

import { StorageDeleteSchema } from './delete.schema';
import StorageDeleteUseCase from './delete.use-case';
import { StorageDeleteParamsValidator } from './delete.validator';

@Controller({
  route: '/storage',
})
export default class {
  constructor(
    private readonly useCase: StorageDeleteUseCase = getInstanceByToken(
      StorageDeleteUseCase,
    ),
  ) {}

  @DELETE({
    url: '/:_id',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
      ],
      schema: StorageDeleteSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = StorageDeleteParamsValidator.parse(request.params);

    const result = await this.useCase.execute(params);

    if (result.isLeft()) {
      const error = result.value;

      return response.status(error.code).send({
        message: error.message,
        code: error.code,
        cause: error.cause,
        ...(error.errors && { errors: error.errors }),
      });
    }

    return response.status(200).send({
      message: 'Arquivo deletado com sucesso',
      deletedAt: new Date().toISOString(),
    });
  }
}
