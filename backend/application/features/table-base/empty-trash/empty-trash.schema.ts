import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const EmptyTrashSchema: FastifySchema = {
  tags: ['Tabelas'],
  summary: 'Esvaziar lixeira - excluir todas as tabelas na lixeira',
  description:
    'Exclui permanentemente todas as tabelas na lixeira, incluindo seus campos e coleções dinâmicas. Esta ação não pode ser desfeita.',
  security: [{ cookieAuth: [] }],
  response: {
    200: {
      description: 'Lixeira esvaziada com sucesso',
      type: 'object',
      properties: {
        deleted: {
          type: 'number',
          description: 'Quantidade de tabelas excluídas permanentemente',
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
    500: buildErrorResponse(500, 'EMPTY_TRASH_TABLES_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
