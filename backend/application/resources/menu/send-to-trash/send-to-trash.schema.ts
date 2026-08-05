import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const MenuSendToTrashSchema: FastifySchema = {
  tags: ['Menu'],
  summary: 'Enviar menu para a lixeira (soft delete)',
  description:
    'Move um item de menu para a lixeira. Impede exclusão de menus com filhos ativos.',
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
      description: 'Menu movido para lixeira com sucesso',
      type: 'null',
    },
    400: buildErrorResponse(400, 'INVALID_PAYLOAD_FORMAT', {
      description: 'Requisição inválida - Falha na validação',
      messageDescription: 'Mensagem de erro',
      errorsDescription: 'Erros de validação por campo',
    }),
    401: buildErrorResponse(401, 'AUTHENTICATION_REQUIRED', {
      description: 'Não autorizado - Autenticação necessária',
      message: 'Autenticação necessária',
    }),
    404: buildErrorResponse(404, 'MENU_NOT_FOUND', {
      description: 'Menu não encontrado',
      message: 'Menu não encontrado',
    }),
    409: buildErrorResponse(409, 'MENU_HAS_CHILDREN', {
      description: 'Menu possui filhos ativos',
      message: 'Menu possui filhos ativos',
    }),
    500: buildErrorResponse(500, 'SEND_TO_TRASH_MENU_ERROR', {
      description: 'Erro interno do servidor',
      message: 'Erro interno do servidor',
    }),
  },
};
