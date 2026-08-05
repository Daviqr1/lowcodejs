import { Service } from 'fastify-decorators';

import {
  E_JWT_TYPE,
  E_USER_STATUS,
  type IJWTPayload,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
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
  constructor(
    private readonly session: SessionContractService,
    private readonly userRepository: UserContractRepository,
  ) {}

  /**
   * O token so vale enquanto a geracao de sessao dele for a corrente. Trocar
   * senha ou desativar/remover o usuario incrementa `sessionVersion` e derruba
   * o que ja estava emitido. Tokens anteriores a este campo valem 0.
   */
  private async sessionIsCurrent(payload: IJWTPayload): Promise<boolean> {
    const user = await this.userRepository.findById(payload.sub);

    if (!user) return false;
    if (user.status !== E_USER_STATUS.ACTIVE) return false;

    return (user.sessionVersion ?? 0) === (payload.sessionVersion ?? 0);
  }

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

      if (!(await this.sessionIsCurrent(decoded))) {
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
