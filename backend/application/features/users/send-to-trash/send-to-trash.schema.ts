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

export const UserSendToTrashSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Enviar usuário para a lixeira',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(UserIdentifierParamsValidator),
  response: {
    200: emptyResponse('Usuário enviado para a lixeira com sucesso'),
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    404: UserNotFoundResponse,
    409: buildErrorResponse(
      409,
      [
        E_ERROR_CODE.ALREADY_TRASHED,
        'CANNOT_TRASH_SELF',
        'CANNOT_TRASH_MASTER',
      ],
      { description: 'Conflito - Envio para lixeira não permitido' },
    ),
    500: serverErrorResponse('SEND_USER_TO_TRASH_ERROR'),
  },
};
