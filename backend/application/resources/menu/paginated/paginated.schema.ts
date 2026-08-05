import type { FastifySchema } from 'fastify';

import { zodToRouteSchema } from '@application/core/schema.core';

import {
  MenuPaginatedResponse,
  serverErrorResponse,
  UnauthorizedResponse,
} from '../_shared.response';
import { MenuPaginatedQueryValidator } from '../_shared.validator';

export const MenuPaginatedSchema: FastifySchema = {
  tags: ['Menu'],
  summary: 'Listar itens de menu com paginação',
  security: [{ cookieAuth: [] }],
  querystring: zodToRouteSchema(MenuPaginatedQueryValidator),
  response: {
    200: MenuPaginatedResponse,
    401: UnauthorizedResponse,
    500: serverErrorResponse('LIST_MENU_PAGINATED_ERROR'),
  },
};
