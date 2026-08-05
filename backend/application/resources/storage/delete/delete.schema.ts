import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const StorageDeleteSchema: FastifySchema = {
  tags: ['Armazenamento'],
  summary: 'Deletar arquivo do armazenamento',
  description:
    'Remove permanentemente um arquivo do banco de dados e do sistema de arquivos. Esta ação não pode ser desfeita',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['_id'],
    properties: {
      _id: {
        type: 'string',
        description: 'ID do registro de armazenamento para deletar',
        examples: ['507f1f77bcf86cd799439011'],
        errorMessage: {
          type: 'O ID deve ser um texto',
        },
      },
    },
    additionalProperties: false,
    errorMessage: {
      required: {
        _id: 'O ID é obrigatório',
      },
      additionalProperties: 'Campos extras não são permitidos',
    },
  },
  response: {
    200: {
      description: 'Arquivo deletado com sucesso',
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Mensagem de confirmação' },
        deletedAt: {
          type: 'string',
          format: 'date-time',
          description: 'Data da exclusão',
        },
      },
    },
    401: buildErrorResponse(401, 'AUTHENTICATION_REQUIRED', {
      description: 'Não autorizado - Autenticação necessária',
    }),
    404: buildErrorResponse(404, 'STORAGE_NOT_FOUND', {
      description: 'Arquivo não encontrado',
    }),
    500: buildErrorResponse(500, 'STORAGE_DELETE_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
