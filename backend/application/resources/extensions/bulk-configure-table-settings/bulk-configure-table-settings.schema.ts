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

export const BulkConfigureTableSettingsSchema: FastifySchema = {
  tags: ['Extensões'],
  summary: 'Configura settings de um guard em várias tabelas de uma vez',
  description:
    'Aplica a mesma configuração em até 50 tabelas simultaneamente. Para cada tableId tenta `guard.onTableBound`; sucessos são persistidos em `tableSettings[tableId]` e tableId é adicionado ao `tableScope.tableIds`. Falhas são reportadas em `failed[]`. Usa optimistic lock global via expectedUpdatedAt. Retorna 409 em conflito. MASTER only.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
    },
    required: ['_id'],
  },
  body: {
    type: 'object',
    properties: {
      tableIds: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 50,
      },
      settings: { type: 'object', additionalProperties: true },
      expectedUpdatedAt: { type: 'string', format: 'date-time' },
    },
    required: ['tableIds', 'settings', 'expectedUpdatedAt'],
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'object',
      properties: {
        extension: { type: 'object', additionalProperties: true },
        success: {
          type: 'array',
          items: { type: 'string' },
          description: 'tableIds que foram configurados com sucesso',
        },
        failed: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tableId: { type: 'string' },
              reason: { type: 'string' },
              message: { type: 'string' },
            },
            required: ['tableId', 'reason', 'message'],
          },
        },
      },
      required: ['extension', 'success', 'failed'],
    },
    400: errorBlock,
    401: errorBlock,
    403: errorBlock,
    404: errorBlock,
    409: errorBlock,
    500: errorBlock,
  },
};
