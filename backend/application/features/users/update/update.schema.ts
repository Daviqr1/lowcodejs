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
import {
  UserIdentifierParamsValidator,
  UserUpdateBodyValidator,
} from '../_shared.validator';

export const UserUpdateSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Atualizar usuário',
  description:
    'Atualiza um usuário existente com novos dados, incluindo troca de senha opcional',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(UserIdentifierParamsValidator),
  body: zodToRouteSchema(UserUpdateBodyValidator),
  response: {
    200: {
      ...UserDetailResponse,
      description: 'Usuário atualizado com sucesso',
    },
    400: InvalidPayloadResponse,
    401: UnauthorizedResponse,
    403: buildErrorResponse(403, 'CANNOT_ASSIGN_PRIVILEGED_GROUP', {
      description: 'Apenas MASTER pode atribuir grupos privilegiados',
    }),
    404: buildErrorResponse(
      404,
      [E_ERROR_CODE.USER_NOT_FOUND, E_ERROR_CODE.GROUP_NOT_FOUND],
      { description: 'Usuário ou grupo informado não existe' },
    ),
    409: buildErrorResponse(409, 'EMAIL_ALREADY_EXISTS', {
      description: 'Conflito - E-mail já cadastrado em outro usuário',
    }),
    500: serverErrorResponse('UPDATE_USER_ERROR'),
  },
};
