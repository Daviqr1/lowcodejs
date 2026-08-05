import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const MenuEmptyTrashSchema: FastifySchema = {
  tags: ['Menu'],
  summary: 'Esvaziar lixeira de menus',
  description: 'Remove permanentemente todos os menus que estão na lixeira.',
  security: [{ cookieAuth: [] }],
  response: {
    200: {
      description: 'Lixeira esvaziada com sucesso',
      type: 'object',
      properties: {
        deleted: {
          type: 'number',
          description: 'Quantidade de menus removidos permanentemente',
        },
      },
    },
    401: buildErrorResponse(401, 'AUTHENTICATION_REQUIRED', {
      description: 'Não autorizado - Autenticação necessária',
      message: 'Autenticação necessária',
    }),
    403: buildErrorResponse(403, 'FORBIDDEN', {
      description: 'Proibido - Permissão insuficiente',
    }),
    500: buildErrorResponse(500, 'EMPTY_TRASH_MENUS_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
