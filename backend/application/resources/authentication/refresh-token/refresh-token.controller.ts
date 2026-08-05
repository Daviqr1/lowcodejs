import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { E_JWT_TYPE, type IJWTPayload } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';
import { REFRESH_TOKEN_COOKIE } from '@application/services/session/session-contract.service';
import { SessionContractService } from '@application/services/session/session-contract.service';
import SessionService from '@application/services/session/session.service';

import { RefreshTokenSchema } from './refresh-token.schema';
import RefreshTokenUseCase from './refresh-token.use-case';

// Resolvido no import do modulo — `loadControllers()` roda depois de
// `registerDependencies()`, entao o container ja esta populado.
const session = getInstanceByToken<SessionContractService>(SessionService);

@Controller({
  route: 'authentication',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: RefreshTokenUseCase = getInstanceByToken(
      RefreshTokenUseCase,
    ),
  ) {}

  @POST({
    url: '/refresh-token',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: true,
        }),
      ],
      schema: RefreshTokenSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    try {
      const refreshToken = session.getRequestCookie(
        request,
        REFRESH_TOKEN_COOKIE,
      );

      if (!refreshToken) {
        return response.status(401).send({
          message: 'Missing refresh token',
          code: 401,
          cause: 'MISSING_REFRESH_TOKEN',
        });
      }

      const refreshTokenDecoded: IJWTPayload | null = await session.verifyToken(
        request,
        refreshToken,
      );

      const activeAccountId = session.getActiveAccountId(request);

      if (
        !refreshTokenDecoded ||
        refreshTokenDecoded.type !== E_JWT_TYPE.REFRESH ||
        (activeAccountId && refreshTokenDecoded.sub !== activeAccountId)
      ) {
        return response.status(401).send({
          message: 'Invalid or expired refresh token',
          code: 401,
          cause: 'INVALID_REFRESH_TOKEN',
        });
      }

      const result = await this.useCase.execute({
        _id: refreshTokenDecoded.sub,
        sessionVersion: refreshTokenDecoded.sessionVersion,
      });

      if (result.isLeft()) return this.http.sendError(response, result.value);

      const tokens = await session.createTokens(result.value, response);

      session.setActiveSession(response, refreshTokenDecoded.sub, {
        ...tokens,
      });

      return response.status(200).send();
    } catch (_error) {
      return response.status(401).send({
        message: 'Invalid or expired refresh token',
        code: 401,
        cause: 'INVALID_REFRESH_TOKEN',
      });
    }
  }
}
