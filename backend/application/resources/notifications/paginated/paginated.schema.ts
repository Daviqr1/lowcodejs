import type { FastifySchema } from 'fastify';

import { zodToRouteSchema } from '@application/core/schema.core';

import {
  NotificationPaginatedResponse,
  serverErrorResponse,
  UnauthorizedResponse,
} from '../_shared.response';
import { NotificationPaginatedQueryValidator } from '../_shared.validator';

export const NotificationPaginatedSchema: FastifySchema = {
  tags: ['Notificações'],
  summary: 'Listar notificações do usuário autenticado',
  description:
    'Retorna as notificações do usuário autenticado, com filtro opcional por não lidas.',
  security: [{ cookieAuth: [] }],
  querystring: zodToRouteSchema(NotificationPaginatedQueryValidator),
  response: {
    200: NotificationPaginatedResponse,
    401: UnauthorizedResponse,
    500: serverErrorResponse('LIST_NOTIFICATIONS_ERROR'),
  },
};
