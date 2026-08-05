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
  UserGroupNotFoundResponse,
} from '../_shared.response';
import { UserGroupIdentifierParamsValidator } from '../_shared.validator';

export const UserGroupRemoveFromTrashSchema: FastifySchema = {
  tags: ['Grupos de Usuários'],
  summary: 'Restaurar grupo da lixeira',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(UserGroupIdentifierParamsValidator),
  response: {
    200: emptyResponse('Grupo restaurado da lixeira com sucesso'),
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    404: UserGroupNotFoundResponse,
    409: buildErrorResponse(409, E_ERROR_CODE.NOT_TRASHED, {
      description: 'Conflito - Grupo não está na lixeira',
    }),
    500: serverErrorResponse('REMOVE_GROUP_FROM_TRASH_ERROR'),
  },
};
