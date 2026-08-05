import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const TableFieldDeleteSchema: FastifySchema = {
  tags: ['Campos'],
  summary: 'Excluir campo permanentemente',
  description:
    'Exclui permanentemente um campo que está na lixeira. O campo deve estar na lixeira antes da exclusão permanente. Suporta exclusão de campos dentro de grupos via query param group.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['slug', '_id'],
    properties: {
      slug: {
        type: 'string',
        description: 'Slug da tabela que contém o campo',
      },
      _id: {
        type: 'string',
        description: 'ID do campo a ser excluído permanentemente',
      },
    },
    additionalProperties: false,
  },
  querystring: {
    type: 'object',
    properties: {
      group: {
        type: 'string',
        description: 'Slug do grupo (ao excluir um campo dentro de um grupo)',
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Campo excluído permanentemente com sucesso',
      type: 'null',
    },
    400: buildErrorResponse(400, 'INVALID_PAYLOAD_FORMAT', {
      description: 'Requisição inválida - Falha na validação do payload',
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
        'NATIVE_FIELD_CANNOT_BE_DELETED',
        'FIELD_LOCKED',
      ],
      {
        description: 'Acesso negado - Permissões insuficientes',
      },
    ),
    404: buildErrorResponse(
      404,
      ['TABLE_NOT_FOUND', 'GROUP_NOT_FOUND', 'FIELD_NOT_FOUND'],
      {
        description: 'Não encontrado - Tabela, grupo ou campo não existe',
      },
    ),
    409: buildErrorResponse(409, 'FIELD_NOT_TRASHED', {
      description: 'Conflito - Campo não está na lixeira',
    }),
    500: buildErrorResponse(500, 'DELETE_FIELD_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
