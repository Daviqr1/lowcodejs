import type { FastifySchema } from 'fastify';

export const RelationshipListBySideSchema: FastifySchema = {
  tags: ['Relacionamentos'],
  summary: 'Listar vínculos por lado',
  description:
    'Lista paginada dos vínculos de um registro num lado (source/target). Alimenta a tabela interna de gestão do detalhe.',
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
  querystring: {
    type: 'object',
    required: ['side', 'recordId'],
    properties: {
      side: { type: 'string', enum: ['source', 'target'] },
      recordId: { type: 'string' },
      page: { type: 'number', minimum: 1 },
      perPage: { type: 'number', minimum: 1, maximum: 100 },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { type: 'object', additionalProperties: true },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            perPage: { type: 'number' },
            lastPage: { type: 'number' },
            firstPage: { type: 'number' },
          },
        },
      },
    },
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
        cause: { type: 'string', enum: ['LIST_RELATIONSHIP_LINKS_ERROR'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};
