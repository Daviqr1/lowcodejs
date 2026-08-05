import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import HttpResponseService from '@application/services/http-response/http-response.service';
import { SessionContractService } from '@application/services/session/session-contract.service';
import SessionService from '@application/services/session/session.service';
import { Env } from '@start/env';

import { MagicLinkQueryValidator } from '../_shared.validator';

import { MagicLinkSchema } from './magic-link.schema';
import MagicLinkUseCase from './magic-link.use-case';

// Resolvido no import do modulo — `loadControllers()` roda depois de
// `registerDependencies()`, entao o container ja esta populado.
const session = getInstanceByToken<SessionContractService>(SessionService);

@Controller({
  route: '/authentication',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: MagicLinkUseCase = getInstanceByToken(
      MagicLinkUseCase,
    ),
  ) {}

  @GET({
    url: '/magic-link',
    options: {
      schema: MagicLinkSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const payload = MagicLinkQueryValidator.parse(request.query);

    const result = await this.useCase.execute(payload);

    if (result.isLeft()) return this.http.sendError(response, result.value);

    const tokens = await session.createTokens(result.value, response);

    session.setActiveSession(response, result.value._id.toString(), {
      ...tokens,
    });

    return response
      .status(302)
      .redirect(Env.APP_CLIENT_URL.concat('/dashboard?authentication=success'));
  }
}
