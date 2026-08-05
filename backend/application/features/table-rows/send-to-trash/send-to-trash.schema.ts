import type { FastifySchema } from 'fastify';

import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import { TableRowParamsValidator } from '../_shared.validator';

export const TableRowSendToTrashSchema: FastifySchema = {
  tags: ['Registros'],
  summary: 'Enviar registro para a lixeira',
  description:
    'Move um registro para a lixeira definindo o timestamp trashedAt. O registro pode ser restaurado posteriormente ou excluído permanentemente.',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(TableRowParamsValidator),
  response: {
    200: {
      description: 'Registro enviado para a lixeira com sucesso',
      type: 'object',
      properties: {
        _id: { type: 'string', description: 'ID do registro' },
        trashedAt: {
          type: 'string',
          format: 'date-time',
          description: 'Data/hora em que foi enviado para a lixeira',
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          description: 'Data/hora de criação',
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          description: 'Data/hora da última atualização',
        },
      },
      additionalProperties: true,
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
        description:
          'Acesso negado - Permissão insuficiente ou tabela restrita',
      },
    ),
    404: buildErrorResponse(404, ['TABLE_NOT_FOUND', 'ROW_NOT_FOUND'], {
      description: 'Não encontrado - Tabela ou registro não existe',
    }),
    409: buildErrorResponse(409, 'ALREADY_TRASHED', {
      description: 'Conflito - Registro já está na lixeira',
    }),
    500: buildErrorResponse(500, 'SEND_ROW_TABLE_TO_TRASH_ERROR', {
      description: 'Erro interno do servidor',
      message: 'Erro interno do servidor',
    }),
  },
};
