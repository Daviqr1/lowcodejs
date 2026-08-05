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

export const MenuBulkDeleteSchema: FastifySchema = {
  tags: ['Menu'],
  summary: 'Itens de menu excluídos permanentemente',
  security: [{ cookieAuth: [] }],
  body: zodToRouteSchema(MenuBulkIdsBodyValidator),
  response: {
    200: affectedCountResponse(
      'deleted',
      'Itens de menu excluídos permanentemente',
    ),
    400: InvalidPayloadResponse,
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    500: serverErrorResponse('BULK_DELETE_MENUS_ERROR'),
  },
};
