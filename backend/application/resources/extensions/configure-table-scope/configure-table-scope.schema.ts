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

export const ExtensionConfigureTableScopeSchema: FastifySchema = {
  tags: ['Extensões'],
  summary: 'Configura o escopo por tabela de uma extensão (plugin)',
  description:
    'Define se o plugin aparece em todas as tabelas (mode=all) ou apenas em um conjunto (mode=specific + tableIds). Restrito ao usuário MASTER.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    properties: { _id: { type: 'string' } },
    required: ['_id'],
  },
  body: {
    type: 'object',
    properties: {
      mode: { type: 'string', enum: ['all', 'specific'] },
      tableIds: { type: 'array', items: { type: 'string' } },
    },
    required: ['mode'],
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        tableScope: {
          type: 'object',
          properties: {
            mode: { type: 'string' },
            tableIds: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      additionalProperties: true,
    },
    400: errorBlock,
    401: errorBlock,
    403: errorBlock,
    404: errorBlock,
    500: errorBlock,
  },
};
