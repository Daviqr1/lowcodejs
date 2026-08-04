import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, DELETE, getInstanceByToken } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { StorageDeleteSchema } from './delete.schema';
import StorageDeleteUseCase from './delete.use-case';
import { StorageDeleteParamsValidator } from './delete.validator';

@Controller({
  route: '/storage',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

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

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send({
      message: 'Arquivo deletado com sucesso',
      deletedAt: new Date().toISOString(),
    });
  }
}
