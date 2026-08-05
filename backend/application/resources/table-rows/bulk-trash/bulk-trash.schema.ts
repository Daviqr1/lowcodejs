import type { FastifySchema } from 'fastify';

import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import {
  BulkIdsBodyValidator,
  TableSlugParamsValidator,
} from '../_shared.validator';

export const BulkTrashSchema: FastifySchema = {
  tags: ['Registros'],
  summary: 'Enviar registros para a lixeira em lote',
  description:
    'Move múltiplos registros para a lixeira, definindo trashed=true e trashedAt. Os registros podem ser restaurados ou excluídos permanentemente depois.',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(TableSlugParamsValidator),
  body: zodToRouteSchema(BulkIdsBodyValidator),
  response: {
    200: {
      description: 'Registros enviados para a lixeira com sucesso',
      type: 'object',
      properties: {
        modified: {
          type: 'number',
          description: 'Quantidade de registros enviados para a lixeira',
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
    500: buildErrorResponse(500, 'BULK_TRASH_ROWS_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
