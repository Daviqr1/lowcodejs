import type { FastifySchema } from 'fastify';

export const MenuExportCsvSchema: FastifySchema = {
  tags: ['Menu'],
  summary: 'Exporta menus em CSV',
  description:
    'Gera um arquivo CSV com todos os menus que casam com os filtros aplicados. Restrito a MASTER e ADMINISTRATOR. Cap de 500.000 linhas por export.',
  security: [{ cookieAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      search: { type: 'string', minLength: 1 },
      trashed: { type: 'string', enum: ['true', 'false'] },
      'order-name': { type: 'string', enum: ['asc', 'desc'] },
      'order-position': { type: 'string', enum: ['asc', 'desc'] },
      'order-slug': { type: 'string', enum: ['asc', 'desc'] },
      'order-type': { type: 'string', enum: ['asc', 'desc'] },
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
        message: { type: 'string', enum: ['Autenticação necessária'] },
        code: { type: 'number', enum: [401] },
        cause: { type: 'string', enum: ['AUTHENTICATION_REQUIRED'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    403: {
      description: 'Proibido - Permissão insuficiente',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [403] },
        cause: { type: 'string', enum: ['FORBIDDEN'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    422: {
      description: 'Resultado excede o limite de exportação',
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
        message: { type: 'string', enum: ['Erro interno do servidor'] },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['EXPORT_MENU_CSV_ERROR'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};
