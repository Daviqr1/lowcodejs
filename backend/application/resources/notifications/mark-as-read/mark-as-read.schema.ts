import type { FastifySchema } from 'fastify';

import { zodToRouteSchema } from '@application/core/schema.core';

import {
  NotificationNotFoundResponse,
  NotificationResponse,
  serverErrorResponse,
  UnauthorizedResponse,
} from '../_shared.response';
import { NotificationIdentifierParamsValidator } from '../_shared.validator';

export const NotificationMarkAsReadSchema: FastifySchema = {
  tags: ['Notificações'],
  summary: 'Marcar notificação como lida',
  description:
    'Marca uma notificação do usuário autenticado como lida. Emite evento via WebSocket para o usuário.',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(NotificationIdentifierParamsValidator),
  response: {
    200: {
      ...NotificationResponse,
      description: 'Notificação marcada como lida',
    },
    401: UnauthorizedResponse,
    404: NotificationNotFoundResponse,
    500: serverErrorResponse('MARK_AS_READ_ERROR'),
  },
};
