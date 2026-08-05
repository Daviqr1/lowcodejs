import type { FastifySchema } from 'fastify';

import { zodToRouteSchema } from '@application/core/schema.core';

import {
  RelationshipIdParamsValidator,
  RelationshipUpdateBodyValidator,
} from '../_shared.validator';

export const RelationshipUpdateSchema: FastifySchema = {
  tags: ['Relacionamentos'],
  summary: 'Atualizar definição de relacionamento',
  description: 'Atualiza name, endpoints (source/target) ou onDelete.',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(RelationshipIdParamsValidator),
  body: zodToRouteSchema(RelationshipUpdateBodyValidator),
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
