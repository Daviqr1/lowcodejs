import type { FastifySchema } from 'fastify';

export const RelationshipUnlinkSchema: FastifySchema = {
  tags: ['Relacionamentos'],
  summary: 'Desvincular registros',
  description: 'Remove um vínculo (RelationshipLink) pelo seu id.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['slug', 'id', 'linkId'],
    properties: {
      slug: { type: 'string' },
      id: { type: 'string' },
      linkId: { type: 'string' },
    },
    additionalProperties: false,
  },
  response: {
    204: { type: 'null', description: 'Vínculo removido' },
    400: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [400] },
        cause: {
          type: 'string',
          enum: ['RELATIONSHIP_NOT_PIVOT', 'RELATIONSHIP_REQUIRED'],
        },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    404: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [404] },
        cause: {
          type: 'string',
          enum: ['RELATIONSHIP_LINK_NOT_FOUND', 'RELATIONSHIP_NOT_FOUND'],
        },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    500: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['UNLINK_RELATIONSHIP_ERROR'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};
