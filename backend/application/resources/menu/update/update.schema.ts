import type { FastifySchema } from 'fastify';

import { E_ERROR_CODE } from '@application/core/error-code.core';
import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import {
  MenuResponse,
  serverErrorResponse,
  UnauthorizedResponse,
} from '../_shared.response';
import {
  MenuIdentifierParamsValidator,
  MenuUpdateBodyValidator,
} from '../_shared.validator';

export const MenuUpdateSchema: FastifySchema = {
  tags: ['Menu'],
  summary: 'Atualizar item de menu',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(MenuIdentifierParamsValidator),
  body: zodToRouteSchema(MenuUpdateBodyValidator),
  response: {
    200: {
      ...MenuResponse,
      description: 'Item de menu atualizado com sucesso',
    },
    400: buildErrorResponse(
      400,
      [
        E_ERROR_CODE.INVALID_PAYLOAD_FORMAT,
        E_ERROR_CODE.INVALID_PARAMETERS,
        'CIRCULAR_REFERENCE',
        'SEPARATOR_HAS_CHILDREN',
        'EXTENSION_NOT_ACTIVE',
      ],
      {
        description: 'Requisição inválida - Falha na validação ou hierarquia',
        errorsDescription: 'Erros de validação por campo',
      },
    ),
    401: UnauthorizedResponse,
    404: buildErrorResponse(
      404,
      [
        E_ERROR_CODE.MENU_NOT_FOUND,
        E_ERROR_CODE.PARENT_MENU_NOT_FOUND,
        E_ERROR_CODE.TABLE_NOT_FOUND,
        E_ERROR_CODE.EXTENSION_NOT_FOUND,
      ],
      { description: 'Menu ou referência informada não existe' },
    ),
    409: buildErrorResponse(409, E_ERROR_CODE.MENU_ALREADY_EXISTS, {
      description: 'Conflito - Já existe menu com este slug',
    }),
    500: serverErrorResponse('UPDATE_MENU_ERROR'),
  },
};
