import type { FastifySchema } from 'fastify';

import { serverErrorResponse, UnauthorizedResponse } from '../_shared.response';

export const NotificationUnreadCountSchema: FastifySchema = {
  tags: ['Notificações'],
  summary: 'Contar notificações não lidas',
  description:
    'Retorna a quantidade de notificações não lidas do usuário autenticado.',
  security: [{ cookieAuth: [] }],
  response: {
    200: {
      description: 'Quantidade de notificações não lidas',
      type: 'object',
      properties: {
        count: {
          type: 'number',
          description: 'Total de notificações não lidas',
        },
      },
    },
    401: UnauthorizedResponse,
    500: serverErrorResponse('UNREAD_COUNT_ERROR'),
  },
};
