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

export const UserDeleteSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Excluir usuário permanentemente',
  description:
    'Exclui da lixeira, em definitivo, um usuário sem tabelas ativas',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(UserIdentifierParamsValidator),
  response: {
    200: emptyResponse('Usuário excluído permanentemente'),
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    404: UserNotFoundResponse,
    409: buildErrorResponse(
      409,
      ['CANNOT_DELETE_SELF', E_ERROR_CODE.NOT_TRASHED, 'OWNER_OF_TABLES'],
      { description: 'Conflito - Exclusão não permitida neste estado' },
    ),
    500: serverErrorResponse('DELETE_USER_ERROR'),
  },
};
