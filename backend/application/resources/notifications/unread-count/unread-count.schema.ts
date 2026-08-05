import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

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
    401: buildErrorResponse(401, 'AUTHENTICATION_REQUIRED', {
      description: 'Não autorizado - Autenticação necessária',
      message: 'Não autorizado',
    }),
    500: buildErrorResponse(500, 'UNREAD_COUNT_ERROR', {
      description: 'Erro interno do servidor',
      message: 'Erro interno do servidor',
    }),
  },
};
