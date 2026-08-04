import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { E_JWT_TYPE, type IJWTPayload } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import ProfileShowUseCase from '@application/resources/profile/show/show.use-case';
import { toUserResponse } from '@application/resources/users/users.mapper';
import { REFRESH_TOKEN_COOKIE } from '@application/services/session/session-contract.service';
import { SessionContractService } from '@application/services/session/session-contract.service';
import SessionService from '@application/services/session/session.service';

import { AuthenticationAccountsSchema } from './accounts.schema';

// Resolvido no import do modulo — `loadControllers()` roda depois de
// `registerDependencies()`, entao o container ja esta populado.
const session = getInstanceByToken<SessionContractService>(SessionService);

@Controller({
  route: 'authentication',
})
export default class {
  constructor(
    private readonly profileUseCase: ProfileShowUseCase = getInstanceByToken(
      ProfileShowUseCase,
    ),
  ) {}

  @GET({
    url: '/accounts',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
      ],
      schema: AuthenticationAccountsSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const activeId = session.getActiveAccountId(request);
    const activeRefreshToken = session.getRequestCookie(
      request,
      REFRESH_TOKEN_COOKIE,
    );
    const sessions = session.readAccountSessions(request);

    // Mapa accountId -> refreshToken (conta ativa + inativas, sem duplicar).
    const candidates = new Map<string, string>();
    if (activeId && activeRefreshToken) {
      candidates.set(activeId, activeRefreshToken);
    }
    for (const [accountId, refreshToken] of Object.entries(sessions)) {
      if (!candidates.has(accountId)) candidates.set(accountId, refreshToken);
    }

    const accounts = [];
    const validSessions: Record<string, string> = {};

    for (const [accountId, refreshToken] of candidates) {
      const refreshTokenDecoded: IJWTPayload | null = await session.verifyToken(
        request,
        refreshToken,
      );

      if (
        !refreshTokenDecoded ||
        refreshTokenDecoded.type !== E_JWT_TYPE.REFRESH ||
        refreshTokenDecoded.sub !== accountId
      ) {
        continue;
      }

      const result = await this.profileUseCase.execute({ _id: accountId });

      if (result.isLeft()) continue;

      accounts.push(toUserResponse(result.value));
      if (accountId !== activeId) validSessions[accountId] = refreshToken;
    }

    // Poda sessões inativas inválidas reescrevendo o cookie consolidado.
    session.writeAccountSessions(response, validSessions);

    const activeIsValid = accounts.some(
      (account) => account._id.toString() === activeId,
    );

    let activeAccountId: string | null = null;
    if (activeId && activeIsValid) activeAccountId = activeId;

    if (activeAccountId) {
      session.setActiveAccountCookie(response, activeAccountId);
    } else {
      session.clearActiveAccountCookie(response);
    }

    return response.status(200).send({
      activeAccountId,
      accounts,
    });
  }
}
