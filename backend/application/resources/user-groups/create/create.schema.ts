import type { FastifySchema } from 'fastify';

import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import {
  InvalidPayloadResponse,
  serverErrorResponse,
  UnauthorizedResponse,
  UserGroupResponse,
} from '../_shared.response';
import { UserGroupCreateBodyValidator } from '../_shared.validator';

export const UserGroupCreateSchema: FastifySchema = {
  tags: ['Grupos de Usuários'],
  summary: 'Criar grupo de usuários',
  description: 'Cria um grupo com nome, descrição e permissões atribuídas',
  security: [{ cookieAuth: [] }],
  body: zodToRouteSchema(UserGroupCreateBodyValidator),
  response: {
    201: { ...UserGroupResponse, description: 'Grupo criado com sucesso' },
    400: InvalidPayloadResponse,
    401: UnauthorizedResponse,
    409: buildErrorResponse(409, 'GROUP_EXISTS', {
      description: 'Conflito - Já existe grupo com este slug',
    }),
    500: serverErrorResponse('CREATE_USER_GROUP_ERROR'),
  },
};
