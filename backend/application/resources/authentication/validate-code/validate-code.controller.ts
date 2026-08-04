import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { SessionContractService } from '@application/services/session/session-contract.service';
import SessionService from '@application/services/session/session.service';

import { ValidateCodeSchema } from './validate-code.schema';
import ValidateCodeUseCase from './validate-code.use-case';
import { ValidateCodeBodyValidator } from './validate-code.validator';

// Resolvido no import do modulo — `loadControllers()` roda depois de
// `registerDependencies()`, entao o container ja esta populado.
const session = getInstanceByToken<SessionContractService>(SessionService);

@Controller({
  route: 'authentication',
})
export default class {
  constructor(
    private readonly useCase: ValidateCodeUseCase = getInstanceByToken(
      ValidateCodeUseCase,
    ),
  ) {}

  @POST({
    url: '/recovery/validate-code',
    options: {
      schema: ValidateCodeSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const body = ValidateCodeBodyValidator.parse(request.body);

    const result = await this.useCase.execute(body);

    if (result.isLeft()) {
      const error = result.value;

      return response.status(error.code).send({
        message: error.message,
        code: error.code,
        cause: error.cause,
        ...(error.errors && { errors: error.errors }),
      });
    }

    const tokens = await session.createTokens(result.value.user, response);

    session.setActiveSession(response, result.value.user._id.toString(), {
      ...tokens,
    });

    return response.status(200).send(result.value);
  }
}
