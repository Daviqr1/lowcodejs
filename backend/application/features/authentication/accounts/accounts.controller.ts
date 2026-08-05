import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { E_JWT_TYPE, type IJWTPayload } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import ProfileShowUseCase from '@application/features/profile/show/show.use-case';
import { REFRESH_TOKEN_COOKIE } from '@application/services/session/session-contract.service';
import { SessionContractService } from '@application/services/session/session-contract.service';
import SessionService from '@application/services/session/session.service';
import { UserMapperContractService } from '@application/services/user-mapper/user-mapper-contract.service';
import UserMapperService from '@application/services/user-mapper/user-mapper.service';

import { AuthenticationAccountsSchema } from './accounts.schema';

@Controller({
  route: 'authentication',
})
export default class {
  constructor(
    private readonly profileUseCase: ProfileShowUseCase = getInstanceByToken(
      ProfileShowUseCase,
    ),
    private readonly session: SessionContractService = getInstanceByToken(
      SessionService,
    ),
    private readonly userMapper: UserMapperContractService = getInstanceByToken(
      UserMapperService,
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
    const activeId = this.session.getActiveAccountId(request);
    const activeRefreshToken = this.session.getRequestCookie(
      request,
      REFRESH_TOKEN_COOKIE,
    );
    const sessions = this.session.readAccountSessions(request);

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
      const refreshTokenDecoded: IJWTPayload | null =
        await this.session.verifyToken(request, refreshToken);

      if (
        !refreshTokenDecoded ||
        refreshTokenDecoded.type !== E_JWT_TYPE.REFRESH ||
        refreshTokenDecoded.sub !== accountId
      ) {
        continue;
      }

      const result = await this.profileUseCase.execute({ _id: accountId });

      if (result.isLeft()) continue;

      accounts.push(this.userMapper.toResponse(result.value));
      if (accountId !== activeId) validSessions[accountId] = refreshToken;
    }

    // Poda sessões inativas inválidas reescrevendo o cookie consolidado.
    this.session.writeAccountSessions(response, validSessions);

    const activeIsValid = accounts.some(
      (account) => account._id.toString() === activeId,
    );

    let activeAccountId: string | null = null;
    if (activeId && activeIsValid) activeAccountId = activeId;

    if (activeAccountId) {
      this.session.setActiveAccountCookie(response, activeAccountId);
    } else {
      this.session.clearActiveAccountCookie(response);
    }

    return response.status(200).send({
      activeAccountId,
      accounts,
    });
  }
}
