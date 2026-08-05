import type { FastifySchema } from 'fastify';

import { zodToRouteSchema } from '@application/core/schema.core';

import {
  serverErrorResponse,
  UnauthorizedResponse,
  UserPaginatedResponse,
} from '../_shared.response';
import { UserPaginatedQueryValidator } from '../_shared.validator';

export const UserPaginatedSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Listar usuários com paginação',
  description:
    'Retorna uma lista paginada de usuários com funcionalidade de busca opcional',
  security: [{ cookieAuth: [] }],
  querystring: zodToRouteSchema(UserPaginatedQueryValidator),
  response: {
    200: UserPaginatedResponse,
    401: UnauthorizedResponse,
    500: serverErrorResponse('LIST_USER_PAGINATED_ERROR'),
  },
};
