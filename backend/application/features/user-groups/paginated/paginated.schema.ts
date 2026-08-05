import type { FastifySchema } from 'fastify';

import { zodToRouteSchema } from '@application/core/schema.core';

import {
  serverErrorResponse,
  UnauthorizedResponse,
  UserGroupPaginatedResponse,
} from '../_shared.response';
import { UserGroupPaginatedQueryValidator } from '../_shared.validator';

export const UserGroupPaginatedSchema: FastifySchema = {
  tags: ['Grupos de Usuários'],
  summary: 'Listar grupos de usuários com paginação',
  security: [{ cookieAuth: [] }],
  querystring: zodToRouteSchema(UserGroupPaginatedQueryValidator),
  response: {
    200: UserGroupPaginatedResponse,
    401: UnauthorizedResponse,
    500: serverErrorResponse('LIST_USER_GROUP_PAGINATED_ERROR'),
  },
};
