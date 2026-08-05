import type { FastifySchema } from 'fastify';

import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import {
  ForbiddenResponse,
  serverErrorResponse,
  UnauthorizedResponse,
} from '../_shared.response';
import { UserGroupExportCsvQueryValidator } from '../_shared.validator';

export const UserGroupExportCsvSchema: FastifySchema = {
  tags: ['Grupos de Usuários'],
  summary: 'Exportar grupos de usuários em CSV',
  security: [{ cookieAuth: [] }],
  querystring: zodToRouteSchema(UserGroupExportCsvQueryValidator),
  response: {
    200: { type: 'string', description: 'Arquivo CSV' },
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    413: buildErrorResponse(413, 'EXPORT_LIMIT_EXCEEDED', {
      description: 'Exportação excede o limite de linhas',
    }),
    500: serverErrorResponse('EXPORT_USER_GROUP_CSV_ERROR'),
  },
};
