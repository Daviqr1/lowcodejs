import { Service } from 'fastify-decorators';
import type { Namespace } from 'socket.io';

import { E_JWT_TYPE } from '@application/core/entity.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { GroupResolverContractService } from '@application/services/group-resolver/group-resolver-contract.service';
import {
  ACCESS_TOKEN_COOKIE,
  SessionContractService,
} from '@application/services/session/session-contract.service';

import type {
  JwtDecoder,
  SocketAuthOptions,
} from './socket-auth-contract.service';
import { SocketAuthContractService } from './socket-auth-contract.service';

@Service()
export default class SocketAuthService implements SocketAuthContractService {
  constructor(
    private readonly session: SessionContractService,
    private readonly userRepository: UserContractRepository,
    private readonly groupResolver: GroupResolverContractService,
  ) {}

  protect(
    namespace: Namespace,
    decode: JwtDecoder,
    options: SocketAuthOptions = {},
  ): void {
    namespace.use(async (socket, next) => {
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

      if (options.requireMaster || options.requirePrivileged) {
        const user = await this.userRepository.findById(decoded.sub);

        let allowed = await this.groupResolver.isPrivileged(user);
        if (options.requireMaster) {
          allowed = await this.groupResolver.isMaster(user);
        }

        if (!allowed) {
          next(new Error('Acesso negado.'));
          return;
        }
      }

      socket.data.user = decoded;
      next();
    });
  }

  joinUserRoom(namespace: Namespace): void {
    namespace.on('connection', (socket) => {
      const userId: string = socket.data.user?.sub ?? '';
      if (userId) socket.join(`user:${userId}`);
    });
  }
}
