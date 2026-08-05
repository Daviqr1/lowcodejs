import type { FastifySchema } from 'fastify';

import { zodToRouteSchema } from '@application/core/schema.core';

import {
  serverErrorResponse,
  UnauthorizedResponse,
  UserNotFoundResponse,
  UserDetailResponse,
} from '../_shared.response';
import { UserIdentifierParamsValidator } from '../_shared.validator';

export const UserShowSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Buscar usuário por ID',
  description:
    'Retorna um usuário específico pelo seu ID (senha excluída da resposta)',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(UserIdentifierParamsValidator),
  response: {
    200: { ...UserDetailResponse, description: 'Detalhes do usuário' },
    401: UnauthorizedResponse,
    404: UserNotFoundResponse,
    500: serverErrorResponse('GET_USER_BY_ID_ERROR'),
  },
};
