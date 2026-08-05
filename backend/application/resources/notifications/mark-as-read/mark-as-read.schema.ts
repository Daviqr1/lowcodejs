import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const NotificationMarkAsReadSchema: FastifySchema = {
  tags: ['Notificações'],
  summary: 'Marcar notificação como lida',
  description:
    'Marca uma notificação específica do usuário autenticado como lida. Emite evento via WebSocket para o usuário. Apenas notificações do próprio usuário podem ser marcadas.',
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
      description: 'Notificação marcada como lida',
      type: 'object',
      properties: {
        _id: { type: 'string', description: 'ID da notificação' },
        userId: { type: 'string', description: 'ID do usuário destinatário' },
        type: {
          type: 'string',
          enum: [
            'FORUM_MENTION',
            'KANBAN_COMMENT_MENTION',
            'ROW_MEMBER_ASSIGNED',
            'GENERIC',
          ],
          description: 'Tipo da notificação',
        },
        title: { type: 'string', description: 'Título da notificação' },
        body: {
          type: 'string',
          nullable: true,
          description: 'Corpo da notificação',
        },
        action: {
          type: 'object',
          nullable: true,
          description: 'Ação associada à notificação',
          properties: {
            type: { type: 'string', enum: ['route', 'url'] },
            href: { type: 'string' },
            label: { type: 'string', nullable: true },
          },
        },
        source: {
          type: 'object',
          nullable: true,
          description: 'Origem da notificação',
          properties: {
            pkg: { type: 'string', nullable: true },
            tableSlug: { type: 'string', nullable: true },
            rowId: { type: 'string', nullable: true },
            anchorId: { type: 'string', nullable: true },
          },
        },
        actorUserId: {
          type: 'string',
          nullable: true,
          description: 'ID do usuário que gerou a notificação',
        },
        read: { type: 'boolean', description: 'Se foi lida' },
        readAt: {
          type: 'string',
          format: 'date-time',
          nullable: true,
          description: 'Data da leitura',
        },
        trashed: { type: 'boolean', description: 'Se está na lixeira' },
        trashedAt: {
          type: 'string',
          format: 'date-time',
          nullable: true,
          description: 'Data de envio para lixeira',
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
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
    500: buildErrorResponse(500, 'MARK_AS_READ_ERROR', {
      description: 'Erro interno do servidor',
      message: 'Erro interno do servidor',
    }),
  },
};
