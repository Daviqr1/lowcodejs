import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';

import { StorageUploadSchema } from './upload.schema';
import StorageUploadUseCase from './upload.use-case';
import { StorageUploadQueryValidator } from './upload.validator';

@Controller({
  route: '/storage',
})
export default class {
  constructor(
    private readonly useCase: StorageUploadUseCase = getInstanceByToken(
      StorageUploadUseCase,
    ),
  ) {}

  @POST({
    url: '',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
      ],
      schema: StorageUploadSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const { staticName } = StorageUploadQueryValidator.parse(request.query);

    const result = await this.useCase.execute(request.files(), staticName);

    if (result.isLeft()) {
      const error = result.value;

      return response.status(error.code).send({
        message: error.message,
        code: error.code,
        cause: error.cause,
        ...(error.errors && { errors: error.errors }),
      });
    }

    return response.status(201).send(result.value);
  }
}
