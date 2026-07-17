import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { SettingPublicSchema } from './public.schema';
import SettingPublicUseCase from './public.use-case';

@Controller({
  route: '/setting',
})
export default class {
  constructor(
    private readonly useCase: SettingPublicUseCase = getInstanceByToken(
      SettingPublicUseCase,
    ),
  ) {}

  @GET({
    url: '/public',
    options: {
      schema: SettingPublicSchema,
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
