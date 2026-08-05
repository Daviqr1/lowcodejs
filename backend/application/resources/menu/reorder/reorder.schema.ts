import type { FastifySchema } from 'fastify';

import { zodToRouteSchema } from '@application/core/schema.core';

import {
  affectedCountResponse,
  InvalidPayloadResponse,
  MenuNotFoundResponse,
  serverErrorResponse,
  UnauthorizedResponse,
} from '../_shared.response';
import { MenuReorderBodyValidator } from '../_shared.validator';

export const MenuReorderSchema: FastifySchema = {
  tags: ['Menu'],
  summary: 'Reordenar itens de menu',
  security: [{ cookieAuth: [] }],
  body: zodToRouteSchema(MenuReorderBodyValidator),
  response: {
    200: affectedCountResponse('modified', 'Itens de menu reordenados'),
    400: InvalidPayloadResponse,
    401: UnauthorizedResponse,
    404: MenuNotFoundResponse,
    500: serverErrorResponse('REORDER_MENU_ERROR'),
  },
};
