import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const MenuBulkTrashSchema: FastifySchema = {
  tags: ['Menu'],
  summary: 'Enviar múltiplos menus para a lixeira',
  description:
    'Move múltiplos menus para a lixeira. Aplica cascata para os descendentes dos menus selecionados.',
  security: [{ cookieAuth: [] }],
  body: {
    type: 'object',
    required: ['ids'],
    properties: {
      ids: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        description: 'IDs dos menus a enviar para a lixeira',
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Menus enviados para a lixeira com sucesso',
      type: 'object',
      properties: {
        modified: {
          type: 'number',
          description: 'Quantidade de menus enviados para a lixeira',
        },
      },
    },
    400: buildErrorResponse(
      400,
      ['INVALID_PAYLOAD_FORMAT', 'INVALID_PARAMETERS'],
      {
        description: 'Requisição inválida - Falha na validação',
        messageDescription: 'Mensagem de erro',
        errorsDescription: 'Erros de validação por campo',
      },
    ),
    401: buildErrorResponse(401, 'AUTHENTICATION_REQUIRED', {
      description: 'Não autorizado - Autenticação necessária',
      message: 'Autenticação necessária',
    }),
    403: buildErrorResponse(403, 'FORBIDDEN', {
      description: 'Proibido - Permissão insuficiente',
    }),
    500: buildErrorResponse(500, 'BULK_TRASH_MENUS_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
