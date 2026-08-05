import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

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
    401: buildErrorResponse(401, 'AUTHENTICATION_REQUIRED', {
      description: 'Não autorizado - Autenticação necessária',
      message: 'Não autorizado',
    }),
    404: buildErrorResponse(404, 'NOTIFICATION_NOT_FOUND', {
      description: 'Notificação não encontrada',
      message: 'Notificação não encontrada',
    }),
    500: buildErrorResponse(500, 'DELETE_NOTIFICATION_ERROR', {
      description: 'Erro interno do servidor',
      message: 'Erro interno do servidor',
    }),
  },
};
