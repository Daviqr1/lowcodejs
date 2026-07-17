import type { FastifySchema } from 'fastify';

const endpoint = {
  type: 'object',
  properties: {
    table: {
      type: 'object',
      properties: { _id: { type: 'string' }, slug: { type: 'string' } },
    },
    field: {
      type: 'object',
      properties: { _id: { type: 'string' }, slug: { type: 'string' } },
    },
    visible: { type: 'boolean' },
    label: { type: 'string' },
  },
};

export const RelationshipUpdateSchema: FastifySchema = {
  tags: ['Relacionamentos'],
  summary: 'Atualizar definição de relacionamento',
  description: 'Atualiza name, endpoints (source/target) ou onDelete.',
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
    properties: {
      name: { type: 'string' },
      source: endpoint,
      target: endpoint,
      onDelete: { type: 'string', enum: ['CASCADE', 'SET_NULL', 'RESTRICT'] },
    },
    additionalProperties: false,
  },
  response: {
    200: { type: 'object', additionalProperties: true },
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
        cause: { type: 'string', enum: ['UPDATE_RELATIONSHIP_ERROR'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};
