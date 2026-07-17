import type { FastifySchema } from 'fastify';

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
        cause: { type: 'string', enum: ['UNREAD_COUNT_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
