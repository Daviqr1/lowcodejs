import { type FastifyRequest } from 'fastify';
import { getInstanceByToken } from 'fastify-decorators';

import { E_JWT_TYPE, type IJWTPayload } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { ACCESS_TOKEN_COOKIE } from '@application/services/session/session-contract.service';
import { SessionContractService } from '@application/services/session/session-contract.service';
import SessionService from '@application/services/session/session.service';

// Resolvido no import do modulo — `loadControllers()` roda depois de
// `registerDependencies()`, entao o container ja esta populado.
const session = getInstanceByToken<SessionContractService>(SessionService);

type AuthOptions = {
  optional?: boolean;
};

export function AuthenticationMiddleware(
  options: AuthOptions = { optional: false },
) {
  return async function (request: FastifyRequest): Promise<void> {
    const accessToken = session.getRequestCookie(request, ACCESS_TOKEN_COOKIE);

    if (!accessToken) {
      if (options.optional) return;
      throw HTTPException.Unauthorized(
        'Autenticação necessária',
        'AUTHENTICATION_REQUIRED',
      );
    }

    let accessTokenDecoded: IJWTPayload | null = null;
    try {
      // `verify` confere assinatura RS256 e expiracao; `decode` apenas
      // desserializa e aceitaria um token forjado.
      accessTokenDecoded =
        await request.server.jwt.verify<IJWTPayload>(accessToken);
    } catch {
      if (options.optional) return;
      throw HTTPException.Unauthorized(
        'Autenticação necessária',
        'AUTHENTICATION_REQUIRED',
      );
    }

    if (!accessTokenDecoded || accessTokenDecoded.type !== E_JWT_TYPE.ACCESS) {
      if (options.optional) return;
      throw HTTPException.Unauthorized(
        'Autenticação necessária',
        'AUTHENTICATION_REQUIRED',
      );
    }

    request.user = {
      sub: accessTokenDecoded.sub,
      email: accessTokenDecoded.email,
      role: accessTokenDecoded.role,
      type: E_JWT_TYPE.ACCESS,
    };
  };
}
