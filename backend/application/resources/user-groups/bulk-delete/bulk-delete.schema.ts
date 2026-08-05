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

export const UserGroupBulkDeleteSchema: FastifySchema = {
  tags: ['Grupos de Usuários'],
  summary: 'Grupos excluídos permanentemente',
  security: [{ cookieAuth: [] }],
  body: zodToRouteSchema(UserGroupBulkIdsBodyValidator),
  response: {
    200: affectedCountResponse('deleted', 'Grupos excluídos permanentemente'),
    400: InvalidPayloadResponse,
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    500: serverErrorResponse('BULK_DELETE_GROUPS_ERROR'),
  },
};
