import type { FastifySchema } from 'fastify';

export const BulkRestoreSchema: FastifySchema = {
  tags: ['Tabelas'],
  summary: 'Restaurar tabelas da lixeira em lote',
  description:
    'Restaura múltiplas tabelas da lixeira (trashed=false, trashedAt=null). Tabelas cujo slug já está em uso por uma tabela ativa são puladas e retornadas em "skipped".',
  security: [{ cookieAuth: [] }],
  body: {
    type: 'object',
    required: ['ids'],
    properties: {
      ids: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        description: 'Lista de IDs das tabelas a restaurar da lixeira',
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Tabelas restauradas da lixeira com sucesso',
      type: 'object',
      properties: {
        modified: {
          type: 'number',
          description: 'Quantidade de tabelas restauradas da lixeira',
        },
        skipped: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Slugs das tabelas não restauradas porque uma tabela ativa já usa o mesmo slug',
        },
      },
    },
    401: {
      description: 'Não autenticado - Autenticação necessária',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [401] },
        cause: {
          type: 'string',
          enum: ['AUTHENTICATION_REQUIRED', 'USER_NOT_AUTHENTICATED'],
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    403: {
      description: 'Acesso negado - Permissão insuficiente',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [403] },
        cause: {
          type: 'string',
          enum: [
            'USER_NOT_FOUND',
            'USER_NOT_ACTIVE',
            'PERMISSIONS_NOT_FOUND',
            'INSUFFICIENT_PERMISSIONS',
          ],
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    500: {
      description: 'Erro interno do servidor',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['BULK_RESTORE_TABLES_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
