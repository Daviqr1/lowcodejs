import type { FastifySchema } from 'fastify';

const ERROR_SHAPE = {
  type: 'object',
  properties: {
    message: { type: 'string' },
    code: { type: 'number' },
    cause: { type: 'string' },
    errors: { type: 'object', additionalProperties: { type: 'string' } },
  },
} as const;

export const TableRowExportCsvSchema: FastifySchema = {
  tags: ['Registros'],
  summary: 'Exporta registros (rows) de uma tabela em CSV',
  description:
    'Gera um arquivo CSV (download attachment) com os registros que casam com os filtros aplicados. Restrito a MASTER e ADMINISTRATOR. Cap de 500.000 linhas por export. Colunas dinâmicas baseadas nos campos não-nativos da tabela.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    properties: {
      slug: { type: 'string', description: 'Slug da tabela' },
    },
    required: ['slug'],
  },
  querystring: {
    type: 'object',
    properties: {
      search: {
        type: 'string',
        description: 'Termo de busca para filtrar registros',
      },
    },
    additionalProperties: true,
  },
  response: {
    200: {
      description: 'Arquivo CSV (download attachment)',
      type: 'string',
      format: 'binary',
    },
    401: {
      ...ERROR_SHAPE,
      description: 'Não autorizado - Autenticação necessária',
      properties: {
        ...ERROR_SHAPE.properties,
        code: { type: 'number', enum: [401] },
        cause: {
          type: 'string',
          enum: ['AUTHENTICATION_REQUIRED', 'USER_NOT_AUTHENTICATED'],
        },
      },
    },
    403: {
      ...ERROR_SHAPE,
      description: 'Acesso negado - Permissão insuficiente',
      properties: {
        ...ERROR_SHAPE.properties,
        code: { type: 'number', enum: [403] },
        cause: {
          type: 'string',
          enum: [
            'FORBIDDEN',
            'USER_NOT_FOUND',
            'USER_NOT_ACTIVE',
            'PERMISSIONS_NOT_FOUND',
            'INSUFFICIENT_PERMISSIONS',
            'OWNER_OR_ADMIN_REQUIRED',
            'TABLE_PRIVATE',
            'RESTRICTED_CREATE',
            'FORM_VIEW_RESTRICTED',
          ],
        },
      },
    },
    404: {
      ...ERROR_SHAPE,
      description: 'Tabela não encontrada',
      properties: {
        ...ERROR_SHAPE.properties,
        code: { type: 'number', enum: [404] },
        cause: { type: 'string', enum: ['TABLE_NOT_FOUND'] },
      },
    },
    422: {
      ...ERROR_SHAPE,
      description: 'Limite de exportação excedido',
      properties: {
        ...ERROR_SHAPE.properties,
        code: { type: 'number', enum: [422] },
        cause: { type: 'string', enum: ['EXPORT_LIMIT_EXCEEDED'] },
      },
    },
    500: {
      ...ERROR_SHAPE,
      description: 'Erro interno do servidor',
      properties: {
        ...ERROR_SHAPE.properties,
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['EXPORT_TABLE_ROW_CSV_ERROR'] },
      },
    },
  },
};
