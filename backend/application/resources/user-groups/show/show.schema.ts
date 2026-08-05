import type { FastifySchema } from 'fastify';

import { zodToRouteSchema } from '@application/core/schema.core';

import {
  InvalidPayloadResponse,
  serverErrorResponse,
  UnauthorizedResponse,
  UserGroupNotFoundResponse,
  UserGroupResponse,
} from '../_shared.response';
import { UserGroupIdentifierParamsValidator } from '../_shared.validator';

export const UserGroupShowSchema: FastifySchema = {
  tags: ['Grupos de Usuários'],
  summary: 'Buscar grupo de usuários por ID',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(UserGroupIdentifierParamsValidator),
  response: {
    200: { ...UserGroupResponse, description: 'Detalhes do grupo de usuários' },
    400: InvalidPayloadResponse,
    401: UnauthorizedResponse,
    404: UserGroupNotFoundResponse,
    500: serverErrorResponse('GET_USER_GROUP_BY_ID_ERROR'),
  },
};
