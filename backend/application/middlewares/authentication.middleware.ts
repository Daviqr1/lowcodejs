import { type FastifyRequest } from 'fastify';

import { E_JWT_TYPE, type IJWTPayload } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import {
  ACCESS_TOKEN_COOKIE,
  getRequestCookie,
} from '@application/utils/cookies.util';

type AuthOptions = {
  optional?: boolean;
};

export function AuthenticationMiddleware(
  options: AuthOptions = { optional: false },
) {
  return async function (request: FastifyRequest): Promise<void> {
    const accessToken = getRequestCookie(request, ACCESS_TOKEN_COOKIE);

    if (!accessToken) {
      if (options.optional) return;
      throw HTTPException.Unauthorized(
        'Autenticação necessária',
        'AUTHENTICATION_REQUIRED',
      );
    }

    let accessTokenDecoded: IJWTPayload | null = null;
    try {
      accessTokenDecoded = await request.server.jwt.decode(accessToken);
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
