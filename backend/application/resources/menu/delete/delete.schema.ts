import type { FastifySchema } from 'fastify';

import { E_ERROR_CODE } from '@application/core/error-code.core';
import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import {
  emptyResponse,
  MenuNotFoundResponse,
  serverErrorResponse,
  UnauthorizedResponse,
} from '../_shared.response';
import { MenuIdentifierParamsValidator } from '../_shared.validator';

export const MenuDeleteSchema: FastifySchema = {
  tags: ['Menu'],
  summary: 'Excluir item de menu permanentemente',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(MenuIdentifierParamsValidator),
  response: {
    200: emptyResponse('Item de menu excluído permanentemente'),
    401: UnauthorizedResponse,
    404: MenuNotFoundResponse,
    409: buildErrorResponse(409, E_ERROR_CODE.NOT_TRASHED, {
      description: 'Conflito - Item não está na lixeira',
    }),
    500: serverErrorResponse('DELETE_MENU_ERROR'),
  },
};
