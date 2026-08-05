import type { FastifySchema } from 'fastify';

import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import {
  serverErrorResponse,
  UnauthorizedResponse,
  UserGroupNotFoundResponse,
  UserGroupResponse,
} from '../_shared.response';
import {
  UserGroupIdentifierParamsValidator,
  UserGroupUpdateBodyValidator,
} from '../_shared.validator';

export const UserGroupUpdateSchema: FastifySchema = {
  tags: ['Grupos de Usuários'],
  summary: 'Atualizar grupo de usuários',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(UserGroupIdentifierParamsValidator),
  body: zodToRouteSchema(UserGroupUpdateBodyValidator),
  response: {
    200: { ...UserGroupResponse, description: 'Grupo atualizado com sucesso' },
    400: buildErrorResponse(
      400,
      [
        'INVALID_PAYLOAD_FORMAT',
        'INVALID_PARAMETERS',
        'GROUP_SELF_REFERENCE',
        'GROUP_CYCLE_DETECTED',
      ],
      {
        description:
          'Requisição inválida - Falha na validação ou hierarquia de grupos inválida',
        errorsDescription: 'Erros de validação por campo',
      },
    ),
    401: UnauthorizedResponse,
    404: UserGroupNotFoundResponse,
    500: serverErrorResponse('UPDATE_USER_GROUP_ERROR'),
  },
};
