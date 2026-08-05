import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const UserGroupListSchema: FastifySchema = {
  tags: ['Grupos de Usuários'],
  summary: 'Listar todos os grupos de usuários',
  description:
    'Retorna a lista completa de todos os grupos de usuários sem paginação',
  security: [{ cookieAuth: [] }],
  response: {
    200: {
      description: 'Lista completa de grupos de usuários',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          _id: { type: 'string', description: 'ID do grupo' },
          name: { type: 'string', description: 'Nome do grupo' },
          slug: { type: 'string', description: 'Identificador único do grupo' },
          description: { type: 'string', description: 'Descrição do grupo' },
          permissions: {
            type: 'array',
            description: 'Permissões atribuídas ao grupo',
            items: {
              type: 'object',
              properties: {
                _id: { type: 'string', description: 'ID da permissão' },
                name: {
                  type: 'string',
                  description: 'Nome da permissão',
                },
                slug: {
                  type: 'string',
                  description: 'Slug da permissão',
                },
                description: {
                  type: 'string',
                  nullable: true,
                  description: 'Descrição da permissão',
                },
              },
            },
          },
          encompasses: {
            type: 'array',
            description: 'IDs dos grupos englobados',
            items: { type: 'string' },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    401: buildErrorResponse(401, 'AUTHENTICATION_REQUIRED', {
      description: 'Não autorizado - Autenticação necessária',
      message: 'Autenticação necessária',
    }),
    500: buildErrorResponse(500, 'LIST_USER_GROUP_ERROR', {
      description: 'Erro interno do servidor',
      message: 'Erro interno do servidor',
    }),
  },
};
