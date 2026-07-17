import type { FastifySchema } from 'fastify';

export const RelationshipReorderSchema: FastifySchema = {
  tags: ['Relacionamentos'],
  summary: 'Reordenar vínculos',
  description: 'Atualiza o `order` dos vínculos no lado múltiplo.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['slug', 'id'],
    properties: {
      slug: { type: 'string' },
      id: { type: 'string' },
    },
    additionalProperties: false,
  },
  body: {
    type: 'object',
    required: ['items'],
    properties: {
      items: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['linkId', 'order'],
          properties: {
            linkId: { type: 'string' },
            order: { type: 'number', minimum: 0 },
          },
        },
      },
    },
    additionalProperties: false,
  },
  response: {
    204: { type: 'null', description: 'Reordenado' },
    400: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [400] },
        cause: { type: 'string', enum: ['RELATIONSHIP_NOT_PIVOT'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    404: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [404] },
        cause: { type: 'string', enum: ['RELATIONSHIP_NOT_FOUND'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    500: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['REORDER_RELATIONSHIP_LINKS_ERROR'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};
