import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import HttpResponseService from '@application/services/http-response/http-response.service';
import {
  MAX_AUTH_ACCOUNTS,
  REFRESH_TOKEN_COOKIE,
} from '@application/services/session/session-contract.service';
import { SessionContractService } from '@application/services/session/session-contract.service';
import SessionService from '@application/services/session/session.service';

import { SignInSchema } from './sign-in.schema';
import SignInUseCase from './sign-in.use-case';
import { SignInBodyValidator } from './sign-in.validator';

// Resolvido no import do modulo — `loadControllers()` roda depois de
// `registerDependencies()`, entao o container ja esta populado.
const session = getInstanceByToken<SessionContractService>(SessionService);

@Controller({
  route: 'authentication',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: SignInUseCase = getInstanceByToken(SignInUseCase),
  ) {}

  @POST({
    url: '/sign-in',
    options: {
      schema: SignInSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const payload = SignInBodyValidator.parse(request.body);
    const result = await this.useCase.execute(payload);

    if (result.isLeft()) return this.http.sendError(response, result.value);

    const tokens = await session.createTokens(result.value, response);
    const accountId = result.value._id.toString();

    const currentActiveId = session.getActiveAccountId(request);
    const sessions = session.readAccountSessions(request);

    const existingIds = new Set<string>(Object.keys(sessions));
    if (currentActiveId) existingIds.add(currentActiveId);

    if (!existingIds.has(accountId) && existingIds.size >= MAX_AUTH_ACCOUNTS) {
      return response.status(409).send({
        message: 'Limite de contas simultâneas atingido',
        code: 409,
        cause: 'MULTI_ACCOUNT_LIMIT_REACHED',
      });
    }

    // Preserva a sessão ativa atual (de outra conta) movendo-a para o mapa de
    // sessões inativas antes de promover a nova conta.
    if (currentActiveId && currentActiveId !== accountId) {
      const currentRefreshToken = session.getRequestCookie(
        request,
        REFRESH_TOKEN_COOKIE,
      );
      if (currentRefreshToken) sessions[currentActiveId] = currentRefreshToken;
    }

    delete sessions[accountId];

    session.writeAccountSessions(response, sessions);
    session.setActiveSession(response, accountId, { ...tokens });

    return response.status(200).send();
  }
}
