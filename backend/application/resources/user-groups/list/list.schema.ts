import type { FastifySchema } from 'fastify';

import {
  serverErrorResponse,
  UnauthorizedResponse,
  UserGroupListResponse,
} from '../_shared.response';

export const UserGroupListSchema: FastifySchema = {
  tags: ['Grupos de Usuários'],
  summary: 'Listar todos os grupos de usuários',
  security: [{ cookieAuth: [] }],
  response: {
    200: UserGroupListResponse,
    401: UnauthorizedResponse,
    500: serverErrorResponse('LIST_USER_GROUP_ERROR'),
  },
};
