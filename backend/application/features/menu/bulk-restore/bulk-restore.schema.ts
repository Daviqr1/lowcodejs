import type { FastifySchema } from 'fastify';

import { zodToRouteSchema } from '@application/core/schema.core';

import {
  affectedCountResponse,
  ForbiddenResponse,
  InvalidPayloadResponse,
  serverErrorResponse,
  UnauthorizedResponse,
} from '../_shared.response';
import { MenuBulkIdsBodyValidator } from '../_shared.validator';

export const MenuBulkRestoreSchema: FastifySchema = {
  tags: ['Menu'],
  summary: 'Itens de menu restaurados da lixeira',
  security: [{ cookieAuth: [] }],
  body: zodToRouteSchema(MenuBulkIdsBodyValidator),
  response: {
    200: affectedCountResponse(
      'modified',
      'Itens de menu restaurados da lixeira',
    ),
    400: InvalidPayloadResponse,
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    500: serverErrorResponse('BULK_RESTORE_MENUS_ERROR'),
  },
};
