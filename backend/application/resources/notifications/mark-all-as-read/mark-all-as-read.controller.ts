import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_NOTIFICATION_EVENT } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { NotificationContractRepository } from '@application/repositories/notification/notification-contract.repository';
import NotificationMongooseRepository from '@application/repositories/notification/notification.repository';
import { NotificationSocketContractService } from '@application/services/notification-socket/notification-socket-contract.service';
import NotificationSocketService from '@application/services/notification-socket/notification-socket.service';

import { NotificationMarkAllAsReadSchema } from './mark-all-as-read.schema';

@Controller({
  route: '/notifications',
})
export default class {
  constructor(
    private readonly repository: NotificationContractRepository = getInstanceByToken(
      NotificationMongooseRepository,
    ),
    private readonly socket: NotificationSocketContractService = getInstanceByToken(
      NotificationSocketService,
    ),
  ) {}

  @PATCH({
    url: '/read-all',
    options: {
      onRequest: [AuthenticationMiddleware({ optional: false })],
      schema: NotificationMarkAllAsReadSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    try {
      const updated = await this.repository.markAllAsRead(request.user.sub);

      const namespace = this.socket.namespace();
      if (namespace) {
        namespace
          .to(`user:${request.user.sub}`)
          .emit(E_NOTIFICATION_EVENT.READ_ALL, { userId: request.user.sub });
      }

      return response.status(200).send({ updated });
    } catch (error) {
      console.error('[notifications > mark-all-as-read][error]:', error);
      return response.status(500).send({
        message: 'Erro interno do servidor',
        code: 500,
        cause: 'MARK_ALL_AS_READ_ERROR',
      });
    }
  }
}
