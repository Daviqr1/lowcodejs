import type { FastifySchema } from 'fastify';

import { E_ERROR_CODE } from '@application/core/error-code.core';
import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import {
  InvalidPayloadResponse,
  serverErrorResponse,
  UnauthorizedResponse,
  UserDetailResponse,
} from '../_shared.response';
import { UserCreateBodyValidator } from '../_shared.validator';

export const UserCreateSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Criar novo usuário',
  description:
    'Cria uma nova conta de usuário com nome, email, senha e atribui a um grupo',
  security: [{ cookieAuth: [] }],
  body: zodToRouteSchema(UserCreateBodyValidator),
  response: {
    201: { ...UserDetailResponse, description: 'Usuário criado com sucesso' },
    400: InvalidPayloadResponse,
    401: UnauthorizedResponse,
    404: buildErrorResponse(404, E_ERROR_CODE.GROUP_NOT_FOUND, {
      description: 'Grupo informado não existe',
    }),
    409: buildErrorResponse(409, E_ERROR_CODE.USER_ALREADY_EXISTS, {
      description: 'Conflito - Já existe usuário com este email',
    }),
    500: serverErrorResponse('CREATE_USER_ERROR'),
  },
};
