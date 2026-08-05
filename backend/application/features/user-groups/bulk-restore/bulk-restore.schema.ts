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

export const UserGroupBulkRestoreSchema: FastifySchema = {
  tags: ['Grupos de Usuários'],
  summary: 'Grupos restaurados da lixeira',
  security: [{ cookieAuth: [] }],
  body: zodToRouteSchema(UserGroupBulkIdsBodyValidator),
  response: {
    200: affectedCountResponse('modified', 'Grupos restaurados da lixeira'),
    400: InvalidPayloadResponse,
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    500: serverErrorResponse('BULK_RESTORE_GROUPS_ERROR'),
  },
};
