import type { FastifySchema } from 'fastify';

const errorBlock = {
  type: 'object',
  properties: {
    message: { type: 'string' },
    code: { type: 'number' },
    cause: { type: 'string' },
    errors: { type: 'object', additionalProperties: { type: 'string' } },
  },
} as const;

export const ConfigureTableSettingsSchema: FastifySchema = {
  tags: ['Extensões'],
  summary: 'Configura settings de um guard por tabela',
  description:
    'Persiste as configurações específicas de um Row Access Guard para uma tabela particular. Usa optimistic lock via expectedUpdatedAt. Retorna 409 em caso de conflito. Restrito ao usuário MASTER.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      tableId: { type: 'string' },
    },
    required: ['_id', 'tableId'],
  },
  body: {
    type: 'object',
    properties: {
      settings: { type: 'object', additionalProperties: true },
      expectedUpdatedAt: { type: 'string', format: 'date-time' },
    },
    required: ['settings', 'expectedUpdatedAt'],
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        tableSettings: { type: 'object', additionalProperties: true },
        updatedAt: { type: 'string', format: 'date-time' },
      },
      additionalProperties: true,
    },
    400: errorBlock,
    401: errorBlock,
    403: errorBlock,
    404: errorBlock,
    409: errorBlock,
    500: errorBlock,
  },
};
