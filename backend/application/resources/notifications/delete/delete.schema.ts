import type { FastifySchema } from 'fastify';

export const NotificationDeleteSchema: FastifySchema = {
  tags: ['Notificações'],
  summary: 'Excluir notificação',
  description:
    'Exclui permanentemente uma notificação do usuário autenticado. Apenas notificações do próprio usuário podem ser excluídas.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['_id'],
    properties: {
      _id: {
        type: 'string',
        minLength: 1,
        description: 'ID da notificação',
        errorMessage: {
          type: 'O ID deve ser um texto',
          minLength: 'O ID é obrigatório',
        },
      },
    },
    errorMessage: {
      required: {
        _id: 'O ID é obrigatório',
      },
    },
  },
  response: {
    200: {
      description: 'Notificação excluída com sucesso',
      type: 'object',
      properties: {
        ok: { type: 'boolean', enum: [true], description: 'Confirmação' },
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
    404: {
      description: 'Notificação não encontrada',
      type: 'object',
      properties: {
        message: { type: 'string', enum: ['Notificação não encontrada'] },
        code: { type: 'number', enum: [404] },
        cause: { type: 'string', enum: ['NOTIFICATION_NOT_FOUND'] },
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
        cause: { type: 'string', enum: ['DELETE_NOTIFICATION_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
