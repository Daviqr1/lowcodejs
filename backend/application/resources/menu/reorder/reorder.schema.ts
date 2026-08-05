import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const MenuReorderSchema: FastifySchema = {
  tags: ['Menu'],
  summary: 'Reordenar itens de menu',
  description:
    'Atualiza a ordem de múltiplos itens de menu que compartilham o mesmo pai',
  security: [{ cookieAuth: [] }],
  body: {
    type: 'object',
    required: ['items'],
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          required: ['_id', 'order'],
          properties: {
            _id: {
              type: 'string',
              minLength: 1,
              description: 'ID do item de menu',
            },
            order: {
              type: 'integer',
              minimum: 0,
              description: 'Nova posição do item',
            },
            parent: {
              type: 'string',
              nullable: true,
              description: 'ID do novo menu pai (opcional)',
            },
          },
        },
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Itens reordenados com sucesso',
      type: 'null',
    },
    400: buildErrorResponse(
      400,
      ['INVALID_PAYLOAD_FORMAT', 'INVALID_PARAMETERS'],
      {
        description: 'Requisição inválida - Falha na validação',
        messageDescription: 'Mensagem de erro',
      },
    ),
    401: buildErrorResponse(401, 'AUTHENTICATION_REQUIRED', {
      description: 'Não autorizado - Autenticação necessária',
      message: 'Autenticação necessária',
    }),
    404: buildErrorResponse(404, 'MENU_NOT_FOUND', {
      description: 'Menu não encontrado',
      messageDescription: 'Mensagem de erro',
    }),
    500: buildErrorResponse(500, 'REORDER_MENU_ERROR', {
      description: 'Erro interno do servidor',
      message: 'Erro interno do servidor',
    }),
  },
};
