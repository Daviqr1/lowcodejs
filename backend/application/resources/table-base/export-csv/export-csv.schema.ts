import type { FastifySchema } from 'fastify';

export const TableExportCsvSchema: FastifySchema = {
  tags: ['Tabelas'],
  summary: 'Exporta tabelas em CSV',
  description:
    'Gera um arquivo CSV com a metadata de todas as tabelas que casam com os filtros aplicados. Restrito a MASTER e ADMINISTRATOR. Cap de 500.000 linhas por export.',
  security: [{ cookieAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      search: { type: 'string', minLength: 1 },
      name: { type: 'string', minLength: 1 },
      trashed: { type: 'string' },
      owner: { type: 'string' },
      'order-name': { type: 'string', enum: ['asc', 'desc'] },
      'order-link': { type: 'string', enum: ['asc', 'desc'] },
      'order-created-at': { type: 'string', enum: ['asc', 'desc'] },
      'order-owner': { type: 'string', enum: ['asc', 'desc'] },
    },
    additionalProperties: false,
  },
  response: {
    200: { description: 'Arquivo CSV', type: 'string', format: 'binary' },
    401: {
      description: 'Não autenticado - Autenticação necessária',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [401] },
        cause: { type: 'string', enum: ['AUTHENTICATION_REQUIRED'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    403: {
      description: 'Acesso negado - Restrito a MASTER e ADMINISTRATOR',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [403] },
        cause: { type: 'string', enum: ['FORBIDDEN'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    422: {
      description: 'Resultado excede o limite de linhas para exportação',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [422] },
        cause: { type: 'string', enum: ['EXPORT_LIMIT_EXCEEDED'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    500: {
      description: 'Erro interno do servidor',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['EXPORT_TABLE_CSV_ERROR'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};
