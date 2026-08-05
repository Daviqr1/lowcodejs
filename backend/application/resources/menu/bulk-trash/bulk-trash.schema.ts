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

export const MenuBulkTrashSchema: FastifySchema = {
  tags: ['Menu'],
  summary: 'Itens de menu enviados para a lixeira',
  security: [{ cookieAuth: [] }],
  body: zodToRouteSchema(MenuBulkIdsBodyValidator),
  response: {
    200: affectedCountResponse(
      'modified',
      'Itens de menu enviados para a lixeira',
    ),
    400: InvalidPayloadResponse,
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    500: serverErrorResponse('BULK_TRASH_MENUS_ERROR'),
  },
};
