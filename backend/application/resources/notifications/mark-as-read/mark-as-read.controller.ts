import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';
import z from 'zod';

import { E_NOTIFICATION_EVENT } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { NotificationContractRepository } from '@application/repositories/notification/notification-contract.repository';
import NotificationMongooseRepository from '@application/repositories/notification/notification.repository';
import { NotificationSocketContractService } from '@application/services/notification-socket/notification-socket-contract.service';
import NotificationSocketService from '@application/services/notification-socket/notification-socket.service';

import { NotificationMarkAsReadSchema } from './mark-as-read.schema';

const ParamsValidator = z.object({ _id: z.string().trim().min(1) });

@Controller({
  route: '/notifications',
})
export default class {
  constructor(
    private readonly repository: NotificationContractRepository = getInstanceByToken(
      NotificationMongooseRepository,
    ),
  ) {}

  @PATCH({
    url: '/:_id/read',
    options: {
      onRequest: [AuthenticationMiddleware({ optional: false })],
      schema: NotificationMarkAsReadSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    try {
      const params = ParamsValidator.parse(request.params);
      const result = await this.repository.markAsRead(
        params._id,
        request.user.sub,
      );
      if (!result) {
        return response.status(404).send({
          message: 'Notificação não encontrada',
          code: 404,
          cause: 'NOTIFICATION_NOT_FOUND',
        });
      }

      const namespace = getInstanceByToken<NotificationSocketContractService>(
        NotificationSocketService,
      ).namespace();
      if (namespace) {
        namespace
          .to(`user:${request.user.sub}`)
          .emit(E_NOTIFICATION_EVENT.READ, { _id: params._id });
      }

      return response.status(200).send(result);
    } catch (error) {
      console.error('[notifications > mark-as-read][error]:', error);
      return response.status(500).send({
        message: 'Erro interno do servidor',
        code: 500,
        cause: 'MARK_AS_READ_ERROR',
      });
    }
  }
}
