import type { FastifySchema } from 'fastify';

import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import { TableRowParamsValidator } from '../_shared.validator';

export const TableRowDeleteSchema: FastifySchema = {
  tags: ['Registros'],
  summary: 'Excluir registro',
  description:
    'Exclui permanentemente um registro de uma tabela. Esta ação não pode ser desfeita e remove todos os dados associados.',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(TableRowParamsValidator),
  response: {
    200: {
      description: 'Registro excluído com sucesso',
      type: 'null',
    },
    401: buildErrorResponse(
      401,
      ['AUTHENTICATION_REQUIRED', 'USER_NOT_AUTHENTICATED'],
      {
        description: 'Não autorizado - Autenticação necessária',
        messageDescription: 'Mensagem de erro',
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
        messageDescription: 'Mensagem de erro',
      },
    ),
    404: buildErrorResponse(404, ['TABLE_NOT_FOUND', 'ROW_NOT_FOUND'], {
      description: 'Não encontrado - Tabela ou registro não existe',
      messageDescription: 'Mensagem de erro',
    }),
    500: buildErrorResponse(500, 'DELETE_ROW_ERROR', {
      description: 'Erro interno do servidor',
      messageDescription: 'Mensagem de erro',
    }),
  },
};
