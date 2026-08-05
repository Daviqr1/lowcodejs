import type { FastifySchema } from 'fastify';

import { zodToRouteSchema } from '@application/core/schema.core';

import {
  InvalidPayloadResponse,
  MenuNotFoundResponse,
  MenuResponse,
  serverErrorResponse,
  UnauthorizedResponse,
} from '../_shared.response';
import { MenuIdentifierParamsValidator } from '../_shared.validator';

export const MenuShowSchema: FastifySchema = {
  tags: ['Menu'],
  summary: 'Buscar item de menu por ID',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(MenuIdentifierParamsValidator),
  response: {
    200: { ...MenuResponse, description: 'Detalhes do item de menu' },
    400: InvalidPayloadResponse,
    401: UnauthorizedResponse,
    404: MenuNotFoundResponse,
    500: serverErrorResponse('GET_MENU_BY_ID_ERROR'),
  },
};
