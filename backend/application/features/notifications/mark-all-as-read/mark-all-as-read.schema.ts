import type { FastifySchema } from 'fastify';

import { serverErrorResponse, UnauthorizedResponse } from '../_shared.response';

export const NotificationMarkAllAsReadSchema: FastifySchema = {
  tags: ['Notificações'],
  summary: 'Marcar todas as notificações como lidas',
  description:
    'Marca todas as notificações não lidas do usuário autenticado como lidas. Emite evento via WebSocket para o usuário.',
  security: [{ cookieAuth: [] }],
  response: {
    200: {
      description: 'Notificações marcadas como lidas com sucesso',
      type: 'object',
      properties: {
        updated: {
          type: 'number',
          description: 'Quantidade de notificações marcadas como lidas',
        },
      },
    },
    401: UnauthorizedResponse,
    500: serverErrorResponse('MARK_ALL_AS_READ_ERROR'),
  },
};
