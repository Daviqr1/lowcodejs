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
import { MenuExportCsvQueryValidator } from '../_shared.validator';

export const MenuExportCsvSchema: FastifySchema = {
  tags: ['Menu'],
  summary: 'Exportar itens de menu em CSV',
  security: [{ cookieAuth: [] }],
  querystring: zodToRouteSchema(MenuExportCsvQueryValidator),
  response: {
    200: { type: 'string', description: 'Arquivo CSV' },
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    413: buildErrorResponse(413, 'EXPORT_LIMIT_EXCEEDED', {
      description: 'Exportação excede o limite de linhas',
    }),
    500: serverErrorResponse('EXPORT_MENU_CSV_ERROR'),
  },
};
