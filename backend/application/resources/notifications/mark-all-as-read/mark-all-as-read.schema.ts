import type { FastifySchema } from 'fastify';

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
    401: {
      description: 'Não autorizado - Autenticação necessária',
      type: 'object',
      properties: {
        message: { type: 'string', enum: ['Não autorizado'] },
        code: { type: 'number', enum: [401] },
        cause: { type: 'string', enum: ['AUTHENTICATION_REQUIRED'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    500: {
      description: 'Erro interno do servidor',
      type: 'object',
      properties: {
        message: { type: 'string', enum: ['Erro interno do servidor'] },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['MARK_ALL_AS_READ_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
