import { Service } from 'fastify-decorators';
import type { Namespace, Server as SocketIOServer } from 'socket.io';

import type { JwtDecoder } from '@application/services/socket-auth/socket-auth-contract.service';
import { SocketAuthContractService } from '@application/services/socket-auth/socket-auth-contract.service';

import {
  NOTIFICATIONS_NAMESPACE,
  NotificationSocketContractService,
} from './notification-socket-contract.service';

@Service()
export default class NotificationSocketService implements NotificationSocketContractService {
  private current: Namespace | null = null;

  constructor(private readonly auth: SocketAuthContractService) {}

  init(io: SocketIOServer, decode: JwtDecoder): Namespace {
    const namespace = io.of(NOTIFICATIONS_NAMESPACE);

    this.auth.protect(namespace, decode);

    namespace.on('connection', (socket) => {
      const userId: string = socket.data.user?.sub ?? '';
      if (userId) socket.join(`user:${userId}`);
    });

    this.current = namespace;
    return namespace;
  }

  namespace(): Namespace | null {
    return this.current;
  }
}
