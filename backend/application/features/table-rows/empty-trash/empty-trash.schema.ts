import type { FastifySchema } from 'fastify';

import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import { TableSlugParamsValidator } from '../_shared.validator';

export const EmptyTrashSchema: FastifySchema = {
  tags: ['Registros'],
  summary: 'Esvaziar lixeira - excluir todos os registros descartados',
  description:
    'Exclui permanentemente todos os registros que estão na lixeira de uma tabela. Operação irreversível.',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(TableSlugParamsValidator),
  response: {
    200: {
      description: 'Lixeira esvaziada com sucesso',
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
    500: buildErrorResponse(500, 'EMPTY_TRASH_ROWS_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
