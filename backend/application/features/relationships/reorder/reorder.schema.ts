import type { FastifySchema } from 'fastify';

import { zodToRouteSchema } from '@application/core/schema.core';

import {
  RelationshipIdParamsValidator,
  RelationshipReorderBodyValidator,
} from '../_shared.validator';

export const RelationshipReorderSchema: FastifySchema = {
  tags: ['Relacionamentos'],
  summary: 'Reordenar vínculos',
  description: 'Atualiza o `order` dos vínculos no lado múltiplo.',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(RelationshipIdParamsValidator),
  body: zodToRouteSchema(RelationshipReorderBodyValidator),
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
