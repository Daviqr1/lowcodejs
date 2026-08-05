import type { FastifySchema } from 'fastify';

import { zodToRouteSchema } from '@application/core/schema.core';

import {
  affectedCountResponse,
  ForbiddenResponse,
  InvalidPayloadResponse,
  serverErrorResponse,
  UnauthorizedResponse,
} from '../_shared.response';
import { UserBulkIdsBodyValidator } from '../_shared.validator';

export const UserBulkTrashSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Usuários enviados para a lixeira com sucesso',
  security: [{ cookieAuth: [] }],
  body: zodToRouteSchema(UserBulkIdsBodyValidator),
  response: {
    200: affectedCountResponse(
      'modified',
      'Usuários enviados para a lixeira com sucesso',
    ),
    400: InvalidPayloadResponse,
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    500: serverErrorResponse('BULK_TRASH_USERS_ERROR'),
  },
};
