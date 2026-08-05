import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const MenuRemoveFromTrashSchema: FastifySchema = {
  tags: ['Menu'],
  summary: 'Remover menu da lixeira',
  description:
    'Restaura um item de menu da lixeira, tornando-o ativo novamente.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['_id'],
    properties: {
      _id: {
        type: 'string',
        minLength: 1,
        description: 'ID do menu',
        errorMessage: {
          type: 'O ID deve ser um texto',
          minLength: 'O ID é obrigatório',
        },
      },
    },
    errorMessage: {
      required: {
        _id: 'O ID é obrigatório',
      },
    },
  },
  response: {
    200: {
      description: 'Menu removido da lixeira com sucesso',
      type: 'null',
    },
    401: buildErrorResponse(401, 'AUTHENTICATION_REQUIRED', {
      description: 'Não autorizado - Autenticação necessária',
      message: 'Autenticação necessária',
    }),
    404: buildErrorResponse(404, 'MENU_NOT_FOUND', {
      description: 'Menu não encontrado',
      message: 'Menu não encontrado',
    }),
    409: buildErrorResponse(409, 'NOT_TRASHED', {
      description: 'Menu não está na lixeira',
      message: 'Menu não está na lixeira',
    }),
    500: buildErrorResponse(500, 'REMOVE_FROM_TRASH_MENU_ERROR', {
      description: 'Erro interno do servidor',
      message: 'Erro interno do servidor',
    }),
  },
};
