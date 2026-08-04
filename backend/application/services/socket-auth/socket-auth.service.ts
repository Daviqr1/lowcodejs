import { Service } from 'fastify-decorators';
import type { Namespace } from 'socket.io';

import { E_JWT_TYPE } from '@application/core/entity.core';
import {
  ACCESS_TOKEN_COOKIE,
  SessionContractService,
} from '@application/services/session/session-contract.service';

import type { JwtDecoder } from './socket-auth-contract.service';
import { SocketAuthContractService } from './socket-auth-contract.service';

@Service()
export default class SocketAuthService implements SocketAuthContractService {
  constructor(private readonly session: SessionContractService) {}

  protect(namespace: Namespace, decode: JwtDecoder): void {
    namespace.use((socket, next) => {
      const accessToken = this.session.extractLastCookieValue(
        socket.handshake.headers.cookie,
        ACCESS_TOKEN_COOKIE,
      );

      if (!accessToken) {
        next(new Error('Autenticação necessária.'));
        return;
      }

      const decoded = decode(accessToken);
      if (!decoded || decoded.type !== E_JWT_TYPE.ACCESS) {
        next(new Error('Token inválido.'));
        return;
      }

      socket.data.user = decoded;
      next();
    });
  }
}
