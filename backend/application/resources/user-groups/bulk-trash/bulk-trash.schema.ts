import type { FastifySchema } from 'fastify';

import { zodToRouteSchema } from '@application/core/schema.core';

import {
  affectedCountResponse,
  ForbiddenResponse,
  InvalidPayloadResponse,
  serverErrorResponse,
  UnauthorizedResponse,
} from '../_shared.response';
import { UserGroupBulkIdsBodyValidator } from '../_shared.validator';

export const UserGroupBulkTrashSchema: FastifySchema = {
  tags: ['Grupos de Usuários'],
  summary: 'Grupos enviados para a lixeira',
  security: [{ cookieAuth: [] }],
  body: zodToRouteSchema(UserGroupBulkIdsBodyValidator),
  response: {
    200: affectedCountResponse('modified', 'Grupos enviados para a lixeira'),
    400: InvalidPayloadResponse,
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    500: serverErrorResponse('BULK_TRASH_GROUPS_ERROR'),
  },
};
