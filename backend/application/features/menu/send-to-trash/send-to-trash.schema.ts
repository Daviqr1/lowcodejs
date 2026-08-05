import type { FastifySchema } from 'fastify';

import { E_ERROR_CODE } from '@application/core/error-code.core';
import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import {
  emptyResponse,
  InvalidPayloadResponse,
  MenuNotFoundResponse,
  serverErrorResponse,
  UnauthorizedResponse,
} from '../_shared.response';
import { MenuIdentifierParamsValidator } from '../_shared.validator';

export const MenuSendToTrashSchema: FastifySchema = {
  tags: ['Menu'],
  summary: 'Enviar item de menu para a lixeira',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(MenuIdentifierParamsValidator),
  response: {
    200: emptyResponse('Item de menu enviado para a lixeira'),
    400: InvalidPayloadResponse,
    401: UnauthorizedResponse,
    404: MenuNotFoundResponse,
    409: buildErrorResponse(
      409,
      [E_ERROR_CODE.ALREADY_TRASHED, 'MENU_HAS_CHILDREN'],
      { description: 'Conflito - Envio para lixeira não permitido' },
    ),
    500: serverErrorResponse('SEND_TO_TRASH_MENU_ERROR'),
  },
};
