import type { FastifySchema } from 'fastify';

import { E_ERROR_CODE } from '@application/core/error-code.core';
import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import {
  emptyResponse,
  ForbiddenResponse,
  serverErrorResponse,
  UnauthorizedResponse,
  UserNotFoundResponse,
} from '../_shared.response';
import { UserIdentifierParamsValidator } from '../_shared.validator';

export const UserRemoveFromTrashSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Restaurar usuário da lixeira',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(UserIdentifierParamsValidator),
  response: {
    200: emptyResponse('Usuário restaurado da lixeira com sucesso'),
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    404: UserNotFoundResponse,
    409: buildErrorResponse(409, E_ERROR_CODE.NOT_TRASHED, {
      description: 'Conflito - Usuário não está na lixeira',
    }),
    500: serverErrorResponse('REMOVE_USER_FROM_TRASH_ERROR'),
  },
};
