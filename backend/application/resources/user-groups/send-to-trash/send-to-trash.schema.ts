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

export const UserGroupSendToTrashSchema: FastifySchema = {
  tags: ['Grupos de Usuários'],
  summary: 'Enviar grupo para a lixeira',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(UserGroupIdentifierParamsValidator),
  response: {
    200: emptyResponse('Grupo enviado para a lixeira com sucesso'),
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    404: UserGroupNotFoundResponse,
    409: buildErrorResponse(
      409,
      [
        E_ERROR_CODE.ALREADY_TRASHED,
        'GROUP_HAS_USERS',
        'SYSTEM_GROUP_PROTECTED',
      ],
      { description: 'Conflito - Envio para lixeira não permitido' },
    ),
    500: serverErrorResponse('SEND_GROUP_TO_TRASH_ERROR'),
  },
};
