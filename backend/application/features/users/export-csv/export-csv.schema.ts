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
import { UserExportCsvQueryValidator } from '../_shared.validator';

export const UserExportCsvSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Exportar usuários em CSV',
  description:
    'Exporta os usuários que casam com o filtro em CSV (MASTER/ADMINISTRATOR)',
  security: [{ cookieAuth: [] }],
  querystring: zodToRouteSchema(UserExportCsvQueryValidator),
  response: {
    200: { type: 'string', description: 'Arquivo CSV' },
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    413: buildErrorResponse(413, 'EXPORT_LIMIT_EXCEEDED', {
      description: 'Exportação excede o limite de linhas',
    }),
    500: serverErrorResponse('EXPORT_USER_CSV_ERROR'),
  },
};
