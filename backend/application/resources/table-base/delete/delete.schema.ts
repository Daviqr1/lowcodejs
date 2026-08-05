import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const TableDeleteSchema: FastifySchema = {
  tags: ['Tabelas'],
  summary: 'Excluir tabela permanentemente',
  description:
    'Exclui permanentemente uma tabela, seus campos e a coleção dinâmica de registros. Esta ação não pode ser desfeita.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['slug'],
    properties: {
      slug: {
        type: 'string',
        description: 'Identificador slug da tabela',
        examples: ['users', 'products', 'blog-posts'],
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Tabela excluída permanentemente com sucesso',
      type: 'object',
      properties: {},
    },
    401: buildErrorResponse(
      401,
      ['AUTHENTICATION_REQUIRED', 'USER_NOT_AUTHENTICATED'],
      {
        description: 'Não autenticado - Autenticação necessária',
      },
    ),
    403: buildErrorResponse(
      403,
      [
        'USER_NOT_FOUND',
        'USER_NOT_ACTIVE',
        'PERMISSIONS_NOT_FOUND',
        'INSUFFICIENT_PERMISSIONS',
        'OWNER_OR_ADMIN_REQUIRED',
        'TABLE_PRIVATE',
      ],
      {
        description: 'Acesso negado - Permissão insuficiente',
      },
    ),
    404: buildErrorResponse(404, 'TABLE_NOT_FOUND', {
      description: 'Tabela não encontrada',
      message: 'Tabela não encontrada',
    }),
    500: buildErrorResponse(500, 'DELETE_TABLE_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
