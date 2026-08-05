import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const BulkRestoreSchema: FastifySchema = {
  tags: ['Tabelas'],
  summary: 'Restaurar tabelas da lixeira em lote',
  description:
    'Restaura múltiplas tabelas da lixeira (trashed=false, trashedAt=null). Tabelas cujo slug já está em uso por uma tabela ativa são puladas e retornadas em "skipped".',
  security: [{ cookieAuth: [] }],
  body: {
    type: 'object',
    required: ['ids'],
    properties: {
      ids: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        description: 'Lista de IDs das tabelas a restaurar da lixeira',
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Tabelas restauradas da lixeira com sucesso',
      type: 'object',
      properties: {
        modified: {
          type: 'number',
          description: 'Quantidade de tabelas restauradas da lixeira',
        },
        skipped: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Slugs das tabelas não restauradas porque uma tabela ativa já usa o mesmo slug',
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
    500: buildErrorResponse(500, 'BULK_RESTORE_TABLES_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
