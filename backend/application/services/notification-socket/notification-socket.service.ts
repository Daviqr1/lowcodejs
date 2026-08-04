import { Service } from 'fastify-decorators';
import type { Namespace, Server as SocketIOServer } from 'socket.io';

import type { JwtDecoder } from '@application/services/socket-auth/socket-auth-contract.service';
import { SocketAuthContractService } from '@application/services/socket-auth/socket-auth-contract.service';
import { SocketNamespaceBase } from '@application/services/socket-auth/socket-namespace.base';

import {
  NOTIFICATIONS_NAMESPACE,
  NotificationSocketContractService,
} from './notification-socket-contract.service';

@Service()
export default class NotificationSocketService
  extends SocketNamespaceBase
  implements NotificationSocketContractService
{
  constructor(private readonly auth: SocketAuthContractService) {
    super();
  }

  protected create(io: SocketIOServer, decode: JwtDecoder): Namespace {
    const namespace = io.of(NOTIFICATIONS_NAMESPACE);

    this.auth.protect(namespace, decode);

    this.auth.joinUserRoom(namespace);

    return namespace;
  }
}
