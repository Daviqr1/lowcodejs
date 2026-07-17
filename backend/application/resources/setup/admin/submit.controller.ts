import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { setActiveSession } from '@application/utils/cookies.util';
import { createTokens } from '@application/utils/jwt.util';

import { SetupAdminSubmitSchema } from './submit.schema';
import SetupAdminSubmitUseCase from './submit.use-case';
import { SetupAdminBodyValidator } from './submit.validator';

@Controller({
  route: '/setup',
})
export default class {
  constructor(
    private readonly useCase: SetupAdminSubmitUseCase = getInstanceByToken(
      SetupAdminSubmitUseCase,
    ),
  ) {}

  @POST({
    url: '/step/admin',
    options: {
      schema: SetupAdminSubmitSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const payload = SetupAdminBodyValidator.parse(request.body);

    const result = await this.useCase.execute({
      name: payload.name,
      email: payload.email,
      password: payload.password,
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

    const { user, ...status } = result.value;
    const tokens = await createTokens(user, response);

    setActiveSession(response, user._id.toString(), { ...tokens });

    return response.status(201).send(status);
  }
}
