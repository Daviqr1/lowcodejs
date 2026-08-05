import type { FastifySchema } from 'fastify';

import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import {
  BulkIdsBodyValidator,
  TableSlugParamsValidator,
} from '../_shared.validator';

export const BulkDeleteSchema: FastifySchema = {
  tags: ['Registros'],
  summary: 'Excluir registros permanentemente em lote',
  description:
    'Exclui permanentemente múltiplos registros de uma tabela. Operação irreversível (hard delete).',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(TableSlugParamsValidator),
  body: zodToRouteSchema(BulkIdsBodyValidator),
  response: {
    200: {
      description: 'Registros excluídos permanentemente',
      type: 'object',
      properties: {
        deleted: {
          type: 'number',
          description: 'Quantidade de registros excluídos permanentemente',
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
    500: buildErrorResponse(500, 'BULK_DELETE_ROWS_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
