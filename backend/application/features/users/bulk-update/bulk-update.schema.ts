import type { FastifySchema } from 'fastify';

import { zodToRouteSchema } from '@application/core/schema.core';

import {
  affectedCountResponse,
  ForbiddenResponse,
  InvalidPayloadResponse,
  serverErrorResponse,
  UnauthorizedResponse,
} from '../_shared.response';
import { UserBulkUpdateBodyValidator } from '../_shared.validator';

export const UserBulkUpdateSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Alterar o status de vários usuários',
  description: 'Ativa ou desativa em massa; o próprio autor fica de fora',
  security: [{ cookieAuth: [] }],
  body: zodToRouteSchema(UserBulkUpdateBodyValidator),
  response: {
    200: affectedCountResponse('modified', 'Usuários atualizados com sucesso'),
    400: InvalidPayloadResponse,
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    500: serverErrorResponse('BULK_UPDATE_USERS_ERROR'),
  },
};
