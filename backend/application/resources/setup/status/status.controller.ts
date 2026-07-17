import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { SetupStatusSchema } from './status.schema';
import SetupStatusUseCase from './status.use-case';

@Controller({
  route: '/setup',
})
export default class {
  constructor(
    private readonly useCase: SetupStatusUseCase = getInstanceByToken(
      SetupStatusUseCase,
    ),
  ) {}

  @GET({
    url: '/status',
    options: {
      schema: SetupStatusSchema,
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

    return response.send(result.value);
  }
}
