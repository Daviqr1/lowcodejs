import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import HttpResponseService from '@application/services/http-response/http-response.service';
import { SessionContractService } from '@application/services/session/session-contract.service';
import SessionService from '@application/services/session/session.service';

import { SetupAdminSubmitSchema } from './submit.schema';
import SetupAdminSubmitUseCase from './submit.use-case';
import { SetupAdminBodyValidator } from './submit.validator';

// Resolvido no import do modulo — `loadControllers()` roda depois de
// `registerDependencies()`, entao o container ja esta populado.
const session = getInstanceByToken<SessionContractService>(SessionService);

@Controller({
  route: '/setup',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

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

    if (result.isLeft()) return this.http.sendError(response, result.value);

    const { user, ...status } = result.value;
    const tokens = await session.createTokens(user, response);

    session.setActiveSession(response, user._id.toString(), { ...tokens });

    return response.status(201).send(status);
  }
}
