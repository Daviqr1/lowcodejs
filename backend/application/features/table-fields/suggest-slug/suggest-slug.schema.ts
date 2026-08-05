import type { FastifySchema } from 'fastify';

import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import {
  TableFieldSuggestSlugBodyValidator,
  TableSlugParamsValidator,
} from '../_shared.validator';

export const TableFieldSuggestSlugSchema: FastifySchema = {
  tags: ['Campos'],
  summary: 'Sugerir slug do campo',
  description:
    'Sugere um slug de campo seguro, curto e único para uma tabela com base no título de exibição.',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(TableSlugParamsValidator),
  body: zodToRouteSchema(TableFieldSuggestSlugBodyValidator),
  response: {
    200: {
      description: 'Slug sugerido',
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          minLength: 2,
          maxLength: 80,
          pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
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
      ],
      {
        description: 'Acesso negado - Permissões insuficientes',
      },
    ),
    404: buildErrorResponse(404, 'TABLE_NOT_FOUND', {
      description: 'Tabela não encontrada',
    }),
    500: buildErrorResponse(500, 'SUGGEST_FIELD_SLUG_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
