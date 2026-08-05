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

export const UserGroupDeleteSchema: FastifySchema = {
  tags: ['Grupos de Usuários'],
  summary: 'Excluir grupo permanentemente',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(UserGroupIdentifierParamsValidator),
  response: {
    200: emptyResponse('Grupo excluído permanentemente'),
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    404: UserGroupNotFoundResponse,
    409: buildErrorResponse(
      409,
      [E_ERROR_CODE.NOT_TRASHED, 'GROUP_HAS_USERS', 'SYSTEM_GROUP_PROTECTED'],
      { description: 'Conflito - Exclusão não permitida neste estado' },
    ),
    500: serverErrorResponse('DELETE_GROUP_ERROR'),
  },
};
