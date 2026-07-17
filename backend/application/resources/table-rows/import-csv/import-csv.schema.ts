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

const TABLE_NOT_FOUND_SHAPE = {
  type: 'object',
  properties: {
    message: { type: 'string' },
    code: { type: 'number', enum: [404] },
    cause: { type: 'string', enum: ['TABLE_NOT_FOUND'] },
    errors: { type: 'object', additionalProperties: { type: 'string' } },
  },
} as const;

export const TableRowImportCsvTemplateSchema: FastifySchema = {
  tags: ['Registros'],
  summary: 'Baixa template CSV para importação de registros',
  description:
    'Retorna arquivo CSV com apenas o cabeçalho (nomes dos campos importáveis). Use para preparar o arquivo de importação. Restrito a MASTER e ADMINISTRATOR.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    properties: {
      slug: { type: 'string', description: 'Slug da tabela' },
    },
    required: ['slug'],
  },
  response: {
    200: {
      description: 'Arquivo CSV template (download attachment)',
      type: 'string',
      format: 'binary',
    },
    401: {
      ...ERROR_SHAPE,
      description: 'Não autorizado - Autenticação necessária',
      properties: {
        ...ERROR_SHAPE.properties,
        code: { type: 'number', enum: [401] },
        cause: { type: 'string', enum: ['AUTHENTICATION_REQUIRED'] },
      },
    },
    403: {
      ...ERROR_SHAPE,
      description:
        'Acesso negado - Permissão insuficiente (apenas MASTER/ADMINISTRATOR)',
      properties: {
        ...ERROR_SHAPE.properties,
        code: { type: 'number', enum: [403] },
        cause: { type: 'string', enum: ['FORBIDDEN'] },
      },
    },
    404: TABLE_NOT_FOUND_SHAPE,
  },
};

export const TableRowImportCsvSchema: FastifySchema = {
  tags: ['Registros'],
  summary: 'Importa registros de um arquivo CSV',
  description:
    'Enfileira um job de importação CSV em background. Progresso via Socket.IO namespace /csv-import, room job:{jobId}. Restrito a MASTER e ADMINISTRATOR.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    properties: {
      slug: { type: 'string' },
    },
    required: ['slug'],
  },
  consumes: ['multipart/form-data'],
  response: {
    202: {
      type: 'object',
      properties: {
        jobId: { type: 'string' },
      },
      required: ['jobId'],
    },
    400: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [400] },
        cause: { type: 'string', enum: ['INVALID_CSV_FILE'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    401: {
      ...ERROR_SHAPE,
      properties: {
        ...ERROR_SHAPE.properties,
        code: { type: 'number', enum: [401] },
      },
    },
    403: {
      ...ERROR_SHAPE,
      properties: {
        ...ERROR_SHAPE.properties,
        code: { type: 'number', enum: [403] },
      },
    },
    404: TABLE_NOT_FOUND_SHAPE,
    500: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['IMPORT_CSV_ERROR'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};
