import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const SchemaImportSchema: FastifySchema = {
  tags: ['Tabelas'],
  summary: 'Importar tabelas em lote a partir de um schema YAML',
  description:
    'Cria múltiplas tabelas em uma única requisição a partir de um YAML declarativo. Cada tabela e seus campos são criados em sequência; erros são reportados individualmente sem abortar as demais. Relacionamentos cross-table dentro do mesmo schema são resolvidos em um segundo passe.',
  security: [{ cookieAuth: [] }],
  body: {
    type: 'object',
    required: ['yaml'],
    properties: {
      yaml: {
        type: 'string',
        description:
          'Conteúdo YAML descrevendo as tabelas (até 5 MB). Veja a documentação para o formato suportado.',
      },
    },
    additionalProperties: false,
  },
  response: {
    201: {
      description: 'Schema processado com sucesso (pode conter erros parciais)',
      type: 'object',
      properties: {
        created: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              slug: { type: 'string' },
              fieldCount: { type: 'number' },
            },
          },
        },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    400: buildErrorResponse(
      400,
      ['INVALID_YAML', 'INVALID_SCHEMA', 'OWNER_REQUIRED'],
      {
        description: 'YAML inválido ou estrutura inconsistente',
      },
    ),
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
    500: buildErrorResponse(500, 'SCHEMA_IMPORT_ERROR', {
      description: 'Erro interno',
    }),
  },
};
