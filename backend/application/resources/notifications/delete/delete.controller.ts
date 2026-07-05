import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, DELETE, getInstanceByToken } from 'fastify-decorators';
import z from 'zod';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { NotificationContractRepository } from '@application/repositories/notification/notification-contract.repository';
import NotificationMongooseRepository from '@application/repositories/notification/notification.repository';

import { NotificationDeleteSchema } from './delete.schema';

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

  @DELETE({
    url: '/:_id',
    options: {
      onRequest: [AuthenticationMiddleware({ optional: false })],
      schema: NotificationDeleteSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    try {
      const params = ParamsValidator.parse(request.params);
      const ok = await this.repository.delete(params._id, request.user.sub);
      if (!ok) {
        return response.status(404).send({
          message: 'Notificação não encontrada',
          code: 404,
          cause: 'NOTIFICATION_NOT_FOUND',
        });
      }
      return response.status(200).send({ ok: true });
    } catch (error) {
      console.error('[notifications > delete][error]:', error);
      return response.status(500).send({
        message: 'Erro interno do servidor',
        code: 500,
        cause: 'DELETE_NOTIFICATION_ERROR',
      });
    }
  }
}
