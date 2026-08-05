import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const BulkTrashSchema: FastifySchema = {
  tags: ['Tabelas'],
  summary: 'Enviar tabelas para a lixeira em lote',
  description:
    'Move múltiplas tabelas para a lixeira (trashed=true, trashedAt=timestamp atual). Retorna a quantidade de tabelas afetadas.',
  security: [{ cookieAuth: [] }],
  body: {
    type: 'object',
    required: ['ids'],
    properties: {
      ids: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        description: 'Lista de IDs das tabelas a mover para a lixeira',
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Tabelas movidas para a lixeira com sucesso',
      type: 'object',
      properties: {
        modified: {
          type: 'number',
          description: 'Quantidade de tabelas movidas para a lixeira',
        },
      },
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
      ],
      {
        description: 'Acesso negado - Permissão insuficiente',
      },
    ),
    500: buildErrorResponse(500, 'BULK_TRASH_TABLES_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
