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
import { MenuCreateBodyValidator } from '../_shared.validator';

export const MenuCreateSchema: FastifySchema = {
  tags: ['Menu'],
  summary: 'Criar item de menu',
  security: [{ cookieAuth: [] }],
  body: zodToRouteSchema(MenuCreateBodyValidator),
  response: {
    201: { ...MenuResponse, description: 'Item de menu criado com sucesso' },
    400: buildErrorResponse(
      400,
      [
        E_ERROR_CODE.INVALID_PAYLOAD_FORMAT,
        E_ERROR_CODE.INVALID_PARAMETERS,
        'EXTENSION_NOT_ACTIVE',
      ],
      {
        description: 'Requisição inválida - Falha na validação',
        errorsDescription: 'Erros de validação por campo',
      },
    ),
    401: UnauthorizedResponse,
    404: buildErrorResponse(
      404,
      [
        E_ERROR_CODE.PARENT_MENU_NOT_FOUND,
        E_ERROR_CODE.TABLE_NOT_FOUND,
        E_ERROR_CODE.EXTENSION_NOT_FOUND,
      ],
      { description: 'Referência informada não existe' },
    ),
    409: buildErrorResponse(409, E_ERROR_CODE.MENU_ALREADY_EXISTS, {
      description: 'Conflito - Já existe menu com este slug',
    }),
    500: serverErrorResponse('CREATE_MENU_ERROR'),
  },
};
