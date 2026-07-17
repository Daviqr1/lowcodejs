import type { FastifySchema } from 'fastify';

export const BulkTrashSchema: FastifySchema = {
  tags: ['Tabelas'],
  summary: 'Enviar tabelas para a lixeira em lote',
  description:
    'Move múltiplas tabelas para a lixeira (trashed=true, trashedAt=timestamp atual). Retorna a quantidade de tabelas afetadas.',
  security: [{ cookieAuth: [] }],
  body: {
    type: 'object',
    required: ['ids'],
    properties: {
      ids: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        description: 'Lista de IDs das tabelas a mover para a lixeira',
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Tabelas movidas para a lixeira com sucesso',
      type: 'object',
      properties: {
        modified: {
          type: 'number',
          description: 'Quantidade de tabelas movidas para a lixeira',
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
        cause: { type: 'string', enum: ['BULK_TRASH_TABLES_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
