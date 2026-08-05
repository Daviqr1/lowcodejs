import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

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
    401: buildErrorResponse(401, 'AUTHENTICATION_REQUIRED', {
      description: 'Não autorizado - Autenticação necessária',
      message: 'Não autorizado',
    }),
    500: buildErrorResponse(500, 'MARK_ALL_AS_READ_ERROR', {
      description: 'Erro interno do servidor',
      message: 'Erro interno do servidor',
    }),
  },
};
