import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, POST, getInstanceByToken } from 'fastify-decorators';

import { E_JWT_TYPE, type IJWTPayload } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import ProfileShowUseCase from '@application/resources/profile/show/show.use-case';
import {
  getActiveAccountId,
  getRequestCookie,
  readAccountSessions,
  REFRESH_TOKEN_COOKIE,
  setActiveSession,
  writeAccountSessions,
} from '@application/utils/cookies.util';
import { createTokens, verifyToken } from '@application/utils/jwt.util';

import { SwitchAccountSchema } from './switch-account.schema';
import { SwitchAccountBodyValidator } from './switch-account.validator';

@Controller({
  route: 'authentication',
})
export default class {
  constructor(
    private readonly profileUseCase: ProfileShowUseCase = getInstanceByToken(
      ProfileShowUseCase,
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
    const currentActiveId = getActiveAccountId(request);

    if (accountId === currentActiveId) {
      return response.status(200).send({ activeAccountId: accountId });
    }

    const sessions = readAccountSessions(request);
    const targetRefreshToken = sessions[accountId];

    if (!targetRefreshToken) {
      return response.status(401).send({
        message: 'Conta autenticada não encontrada',
        code: 401,
        cause: 'AUTH_ACCOUNT_NOT_FOUND',
      });
    }

    const refreshTokenDecoded: IJWTPayload | null = await verifyToken(
      request,
      targetRefreshToken,
    );

    if (
      !refreshTokenDecoded ||
      refreshTokenDecoded.type !== E_JWT_TYPE.REFRESH ||
      refreshTokenDecoded.sub !== accountId
    ) {
      delete sessions[accountId];
      writeAccountSessions(response, sessions);

      return response.status(401).send({
        message: 'Refresh token inválido ou expirado',
        code: 401,
        cause: 'INVALID_REFRESH_TOKEN',
      });
    }

    const result = await this.profileUseCase.execute({ _id: accountId });

    if (result.isLeft()) {
      const error = result.value;

      return response.status(error.code).send({
        message: error.message,
        code: error.code,
        cause: error.cause,
        ...(error.errors && { errors: error.errors }),
      });
    }

    const tokens = await createTokens(result.value, response);

    // Alvo deixa de ser inativo; a conta ativa atual passa a inativa.
    delete sessions[accountId];
    const currentRefreshToken = getRequestCookie(request, REFRESH_TOKEN_COOKIE);
    if (currentActiveId && currentRefreshToken) {
      sessions[currentActiveId] = currentRefreshToken;
    }
    writeAccountSessions(response, sessions);

    setActiveSession(response, accountId, { ...tokens });

    return response.status(200).send({ activeAccountId: accountId });
  }
}
