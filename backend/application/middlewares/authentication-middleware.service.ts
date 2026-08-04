import { Service } from 'fastify-decorators';

import { E_JWT_TYPE, type IJWTPayload } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import {
  ACCESS_TOKEN_COOKIE,
  SessionContractService,
} from '@application/services/session/session-contract.service';

import type {
  AuthOptions,
  RequestHook,
} from './authentication-middleware-contract.service';
import { AuthenticationMiddlewareContractService } from './authentication-middleware-contract.service';

@Service()
export default class AuthenticationMiddlewareService implements AuthenticationMiddlewareContractService {
  private unauthorized(): HTTPException {
    return HTTPException.Unauthorized(
      'Autenticação necessária',
      'AUTHENTICATION_REQUIRED',
    );
  }
  constructor(private readonly session: SessionContractService) {}

  handle(options: AuthOptions = { optional: false }): RequestHook {
    return async (request): Promise<void> => {
      const accessToken = this.session.getRequestCookie(
        request,
        ACCESS_TOKEN_COOKIE,
      );

      if (!accessToken) {
        if (options.optional) return;
        throw this.unauthorized();
      }

      // `verifyToken` confere assinatura RS256 e expiracao; `decode` apenas
      // desserializa e aceitaria um token forjado.
      const decoded: IJWTPayload | null = await this.session.verifyToken(
        request,
        accessToken,
      );

      if (!decoded || decoded.type !== E_JWT_TYPE.ACCESS) {
        if (options.optional) return;
        throw this.unauthorized();
      }

      request.user = {
        sub: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        type: E_JWT_TYPE.ACCESS,
      };
    };
  }
}
