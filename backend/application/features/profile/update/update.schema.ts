import type { FastifySchema } from 'fastify';

import { zodToRouteSchema } from '@application/core/schema.core';

import {
  InvalidPayloadResponse,
  ProfileUpdateResponse,
  serverErrorResponse,
  UnauthorizedResponse,
  UserNotFoundResponse,
} from '../_shared.response';
import { ProfileUpdateBodyValidator } from '../_shared.validator';

export const ProfileUpdateSchema: FastifySchema = {
  tags: ['Perfil'],
  summary: 'Atualizar perfil do usuário autenticado',
  description:
    'Atualiza nome, email e preferências; a troca de senha exige a senha atual',
  security: [{ cookieAuth: [] }],
  body: zodToRouteSchema(ProfileUpdateBodyValidator),
  response: {
    200: ProfileUpdateResponse,
    400: InvalidPayloadResponse,
    401: UnauthorizedResponse,
    404: UserNotFoundResponse,
    500: serverErrorResponse('UPDATE_USER_PROFILE_ERROR'),
  },
};
