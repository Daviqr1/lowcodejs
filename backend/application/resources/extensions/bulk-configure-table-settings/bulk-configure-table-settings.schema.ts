import type { FastifySchema } from 'fastify';

const badRequestBlock = {
  description: 'Requisição inválida',
  type: 'object',
  properties: {
    message: { type: 'string' },
    code: { type: 'number', enum: [400] },
    cause: {
      type: 'string',
      enum: ['INVALID_GUARD_SETTINGS', 'INVALID_PAYLOAD_FORMAT'],
    },
    errors: { type: 'object', additionalProperties: { type: 'string' } },
  },
} as const;

const unauthorizedBlock = {
  description: 'Não autorizado',
  type: 'object',
  properties: {
    message: { type: 'string' },
    code: { type: 'number', enum: [401] },
    cause: { type: 'string', enum: ['AUTHENTICATION_REQUIRED'] },
    errors: { type: 'object', additionalProperties: { type: 'string' } },
  },
} as const;

const forbiddenBlock = {
  description: 'Acesso negado',
  type: 'object',
  properties: {
    message: { type: 'string' },
    code: { type: 'number', enum: [403] },
    cause: { type: 'string', enum: ['FORBIDDEN'] },
    errors: { type: 'object', additionalProperties: { type: 'string' } },
  },
} as const;

const notFoundBlock = {
  description: 'Extensão não encontrada',
  type: 'object',
  properties: {
    message: { type: 'string' },
    code: { type: 'number', enum: [404] },
    cause: { type: 'string', enum: ['EXTENSION_NOT_FOUND'] },
    errors: { type: 'object', additionalProperties: { type: 'string' } },
  },
} as const;

const serverErrorBlock = {
  description: 'Erro interno',
  type: 'object',
  properties: {
    message: { type: 'string' },
    code: { type: 'number', enum: [500] },
    cause: { type: 'string', enum: ['BULK_CONFIGURE_TABLE_SETTINGS_ERROR'] },
    errors: { type: 'object', additionalProperties: { type: 'string' } },
  },
} as const;

export const BulkConfigureTableSettingsSchema: FastifySchema = {
  tags: ['Extensões'],
  summary:
    'Configura as settings de múltiplas tabelas para um plugin row-access-guard',
  description:
    'Persiste tableSettings[tableId] para N tabelas e chama onTableBound em cada uma. Restrito a usuários com MANAGE_PLUGINS.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    properties: { _id: { type: 'string' } },
    required: ['_id'],
  },
  body: {
    type: 'object',
    properties: {
      tableSettings: {
        type: 'object',
        additionalProperties: { type: 'object', additionalProperties: true },
      },
    },
    required: ['tableSettings'],
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'object',
      properties: {
        applied: { type: 'number' },
        skipped: { type: 'number' },
        errors: { type: 'array', items: { type: 'string' } },
      },
      additionalProperties: false,
    },
    400: badRequestBlock,
    401: unauthorizedBlock,
    403: forbiddenBlock,
    404: notFoundBlock,
    500: serverErrorBlock,
  },
};
