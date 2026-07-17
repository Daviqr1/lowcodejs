import type { FastifySchema } from 'fastify';

const endpoint = {
  type: 'object',
  required: ['table', 'field', 'visible', 'label'],
  properties: {
    table: {
      type: 'object',
      required: ['_id', 'slug'],
      properties: {
        _id: { type: 'string' },
        slug: { type: 'string' },
      },
    },
    field: {
      type: 'object',
      required: ['_id', 'slug'],
      properties: {
        _id: { type: 'string' },
        slug: { type: 'string' },
      },
    },
    visible: { type: 'boolean' },
    label: { type: 'string' },
  },
};

export const RelationshipCreateSchema: FastifySchema = {
  tags: ['Relacionamentos'],
  summary: 'Criar definição de relacionamento',
  description:
    'Cria uma RelationshipDefinition (fonte de verdade do vínculo) entre dois lados (source/target). A cardinalidade é derivada do field.multiple de cada lado.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['slug'],
    properties: {
      slug: {
        type: 'string',
        description: 'Slug da tabela de origem (lado de onde se configura)',
      },
    },
    additionalProperties: false,
  },
  body: {
    type: 'object',
    required: ['source', 'target', 'onDelete'],
    properties: {
      name: { type: 'string' },
      source: endpoint,
      target: endpoint,
      onDelete: { type: 'string', enum: ['CASCADE', 'SET_NULL', 'RESTRICT'] },
    },
    additionalProperties: false,
  },
  response: {
    201: {
      description: 'Definição criada',
      type: 'object',
      additionalProperties: true,
    },
    400: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [400] },
        cause: { type: 'string' },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    500: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['CREATE_RELATIONSHIP_ERROR'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};
