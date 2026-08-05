import type { FastifySchema } from 'fastify';

import {
  ProfileShowResponse,
  serverErrorResponse,
  UnauthorizedResponse,
  UserNotFoundResponse,
} from '../_shared.response';

export const ProfileShowSchema: FastifySchema = {
  tags: ['Perfil'],
  summary: 'Buscar perfil do usuário autenticado',
  description: 'Retorna o perfil do usuário do token, com grupo e capacidades',
  security: [{ cookieAuth: [] }],
  response: {
    200: ProfileShowResponse,
    401: UnauthorizedResponse,
    404: UserNotFoundResponse,
    500: serverErrorResponse('GET_USER_PROFILE_ERROR'),
  },
};
