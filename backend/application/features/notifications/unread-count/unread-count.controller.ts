import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { NotificationContractRepository } from '@application/repositories/notification/notification-contract.repository';
import NotificationMongooseRepository from '@application/repositories/notification/notification.repository';

import { NotificationUnreadCountSchema } from './unread-count.schema';

@Controller({
  route: '/notifications',
})
export default class {
  constructor(
    private readonly repository: NotificationContractRepository = getInstanceByToken(
      NotificationMongooseRepository,
    ),
  ) {}

  @GET({
    url: '/unread-count',
    options: {
      onRequest: [AuthenticationMiddleware({ optional: false })],
      schema: NotificationUnreadCountSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    try {
      const count = await this.repository.countUnread(request.user.sub);
      return response.status(200).send({ count });
    } catch (error) {
      console.error('[notifications > unread-count][error]:', error);
      return response.status(500).send({
        message: 'Erro interno do servidor',
        code: 500,
        cause: 'UNREAD_COUNT_ERROR',
      });
    }
  }
}
