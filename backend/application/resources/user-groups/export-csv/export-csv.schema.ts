import type { FastifySchema } from 'fastify';

export const UserGroupExportCsvSchema: FastifySchema = {
  tags: ['Grupos de Usuários'],
  summary: 'Exporta grupos de usuários em CSV',
  description:
    'Gera um arquivo CSV com todos os grupos que casam com os filtros aplicados. Restrito a MASTER e ADMINISTRATOR. Cap de 500.000 linhas por export.',
  security: [{ cookieAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      search: { type: 'string', minLength: 1 },
      trashed: { type: 'string', enum: ['true', 'false'] },
      'order-name': { type: 'string', enum: ['asc', 'desc'] },
      'order-description': { type: 'string', enum: ['asc', 'desc'] },
      'order-created-at': { type: 'string', enum: ['asc', 'desc'] },
    },
    additionalProperties: false,
  },
  response: {
    200: { description: 'Arquivo CSV', type: 'string', format: 'binary' },
    401: {
      description: 'Não autorizado - Autenticação necessária',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [401] },
        cause: { type: 'string', enum: ['AUTHENTICATION_REQUIRED'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    403: {
      description: 'Acesso negado - Permissão insuficiente',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [403] },
        cause: { type: 'string', enum: ['FORBIDDEN'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    422: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [422] },
        cause: { type: 'string', enum: ['EXPORT_LIMIT_EXCEEDED'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    500: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['EXPORT_USER_GROUP_CSV_ERROR'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};
