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

export const ExtensionToggleSchema: FastifySchema = {
  tags: ['Extensões'],
  summary: 'Ativa ou desativa uma extensão',
  description:
    'Alterna o flag enabled. Tentar habilitar uma extensão indisponível resulta em 400. Restrito ao usuário MASTER.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    properties: { _id: { type: 'string' } },
    required: ['_id'],
  },
  body: {
    type: 'object',
    properties: {
      enabled: { type: 'boolean' },
    },
    required: ['enabled'],
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        enabled: { type: 'boolean' },
        available: { type: 'boolean' },
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
