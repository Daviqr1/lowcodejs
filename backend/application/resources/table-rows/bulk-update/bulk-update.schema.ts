import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const BulkUpdateSchema: FastifySchema = {
  tags: ['Registros'],
  summary: 'Atualizar campos de registros em lote',
  description:
    'Aplica o mesmo payload parcial `data` a múltiplos registros em uma requisição. Cada registro passa pelo fluxo de atualização individual (validação, hash de senha, script beforeSave e notificação de menções). Best-effort: registros que falham são reportados em `errors` (id -> cause) e não abortam o lote.',
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
    required: ['ids', 'data'],
    properties: {
      ids: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 200,
        description: 'IDs dos registros a atualizar',
      },
      data: {
        type: 'object',
        minProperties: 1,
        additionalProperties: true,
        description: 'Mapa parcial de campos aplicado a cada registro',
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Registros atualizados (best-effort)',
      type: 'object',
      properties: {
        modified: {
          type: 'number',
          description: 'Quantidade de registros atualizados com sucesso',
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'Mapa id do registro -> causa da falha',
        },
      },
    },
    400: buildErrorResponse(400, 'INVALID_PAYLOAD_FORMAT', {
      description: 'Requisição inválida - Falha na validação',
    }),
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
    500: buildErrorResponse(500, 'BULK_UPDATE_ROWS_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
