import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const UserShowSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Buscar usuário por ID',
  description:
    'Retorna um usuário específico pelo seu ID (senha excluída da resposta)',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['_id'],
    properties: {
      _id: {
        type: 'string',
        description: 'ID do usuário',
      },
    },
  },
  response: {
    200: {
      description: 'Detalhes do usuário',
      type: 'object',
      properties: {
        _id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' },
        group: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
          },
        },
        status: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    401: buildErrorResponse(401, 'AUTHENTICATION_REQUIRED', {
      description: 'Não autorizado - Autenticação necessária',
    }),
    404: buildErrorResponse(404, 'USER_NOT_FOUND', {
      description: 'Usuário não encontrado',
    }),
    500: buildErrorResponse(500, 'GET_USER_BY_ID_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
