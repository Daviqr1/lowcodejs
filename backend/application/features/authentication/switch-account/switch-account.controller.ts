import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, POST, getInstanceByToken } from 'fastify-decorators';

import { E_JWT_TYPE, type IJWTPayload } from '@application/core/entity.core';
import ProfileShowUseCase from '@application/features/profile/show/show.use-case';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';
import { REFRESH_TOKEN_COOKIE } from '@application/services/session/session-contract.service';
import { SessionContractService } from '@application/services/session/session-contract.service';
import SessionService from '@application/services/session/session.service';

import { SwitchAccountBodyValidator } from '../_shared.validator';

import { SwitchAccountSchema } from './switch-account.schema';

@Controller({
  route: 'authentication',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly profileUseCase: ProfileShowUseCase = getInstanceByToken(
      ProfileShowUseCase,
    ),
    private readonly session: SessionContractService = getInstanceByToken(
      SessionService,
    ),
  ) {}

  @POST({
    url: '/switch-account',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
      ],
      schema: SwitchAccountSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const { accountId } = SwitchAccountBodyValidator.parse(request.body);
    const currentActiveId = this.session.getActiveAccountId(request);

    if (accountId === currentActiveId) {
      return response.status(200).send({ activeAccountId: accountId });
    }

    const sessions = this.session.readAccountSessions(request);
    const targetRefreshToken = sessions[accountId];

    if (!targetRefreshToken) {
      return response.status(401).send({
        message: 'Conta autenticada não encontrada',
        code: 401,
        cause: 'AUTH_ACCOUNT_NOT_FOUND',
      });
    }

    const refreshTokenDecoded: IJWTPayload | null =
      await this.session.verifyToken(request, targetRefreshToken);

    if (
      !refreshTokenDecoded ||
      refreshTokenDecoded.type !== E_JWT_TYPE.REFRESH ||
      refreshTokenDecoded.sub !== accountId
    ) {
      delete sessions[accountId];
      this.session.writeAccountSessions(response, sessions);

      return response.status(401).send({
        message: 'Refresh token inválido ou expirado',
        code: 401,
        cause: 'INVALID_REFRESH_TOKEN',
      });
    }

    const result = await this.profileUseCase.execute({ _id: accountId });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    const tokens = await this.session.createTokens(result.value, response);

    // Alvo deixa de ser inativo; a conta ativa atual passa a inativa.
    delete sessions[accountId];
    const currentRefreshToken = this.session.getRequestCookie(
      request,
      REFRESH_TOKEN_COOKIE,
    );
    if (currentActiveId && currentRefreshToken) {
      sessions[currentActiveId] = currentRefreshToken;
    }
    this.session.writeAccountSessions(response, sessions);

    this.session.setActiveSession(response, accountId, { ...tokens });

    return response.status(200).send({ activeAccountId: accountId });
  }
}
