import type { FastifySchema } from 'fastify';

import {
  affectedCountResponse,
  ForbiddenResponse,
  serverErrorResponse,
  UnauthorizedResponse,
} from '../_shared.response';

export const UserEmptyTrashSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Esvaziar a lixeira de usuários',
  security: [{ cookieAuth: [] }],
  response: {
    200: affectedCountResponse('deleted', 'Lixeira esvaziada com sucesso'),
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    500: serverErrorResponse('EMPTY_TRASH_USERS_ERROR'),
  },
};
