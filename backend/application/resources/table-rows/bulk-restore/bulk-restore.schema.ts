import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const BulkRestoreSchema: FastifySchema = {
  tags: ['Registros'],
  summary: 'Restaurar registros da lixeira em lote',
  description:
    'Restaura múltiplos registros da lixeira, definindo trashed=false e trashedAt=null.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['slug'],
    properties: {
      slug: {
        type: 'string',
        description: 'Slug da tabela que contém os registros',
      },
    },
    additionalProperties: false,
  },
  body: {
    type: 'object',
    required: ['ids'],
    properties: {
      ids: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        description: 'IDs dos registros a restaurar da lixeira',
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Registros restaurados da lixeira com sucesso',
      type: 'object',
      properties: {
        modified: {
          type: 'number',
          description: 'Quantidade de registros restaurados',
        },
      },
    },
    401: buildErrorResponse(
      401,
      ['AUTHENTICATION_REQUIRED', 'USER_NOT_AUTHENTICATED'],
      {
        description: 'Não autorizado - Autenticação necessária',
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
        'RESTRICTED_CREATE',
        'FORM_VIEW_RESTRICTED',
      ],
      {
        description: 'Acesso negado - Permissões insuficientes',
      },
    ),
    404: buildErrorResponse(404, 'TABLE_NOT_FOUND', {
      description: 'Tabela não encontrada',
    }),
    500: buildErrorResponse(500, 'BULK_RESTORE_ROWS_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
