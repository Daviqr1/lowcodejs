import type { FastifySchema } from 'fastify';

import { zodToRouteSchema } from '@application/core/schema.core';

import {
  NotificationNotFoundResponse,
  serverErrorResponse,
  UnauthorizedResponse,
} from '../_shared.response';
import { NotificationIdentifierParamsValidator } from '../_shared.validator';

export const NotificationDeleteSchema: FastifySchema = {
  tags: ['Notificações'],
  summary: 'Excluir notificação',
  description: 'Exclui uma notificação do usuário autenticado.',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(NotificationIdentifierParamsValidator),
  response: {
    200: {
      description: 'Notificação excluída com sucesso',
      type: 'object',
      properties: {
        ok: { type: 'boolean', enum: [true], description: 'Confirmação' },
      },
    },
    401: UnauthorizedResponse,
    404: NotificationNotFoundResponse,
    500: serverErrorResponse('DELETE_NOTIFICATION_ERROR'),
  },
};
