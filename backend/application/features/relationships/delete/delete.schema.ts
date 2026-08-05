import type { FastifySchema } from 'fastify';

import { zodToRouteSchema } from '@application/core/schema.core';

import { RelationshipIdParamsValidator } from '../_shared.validator';

export const RelationshipDeleteSchema: FastifySchema = {
  tags: ['Relacionamentos'],
  summary: 'Excluir definição de relacionamento',
  description:
    'Faz soft-delete da RelationshipDefinition e remove todos os seus vínculos.',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(RelationshipIdParamsValidator),
  response: {
    204: { type: 'null', description: 'Definição excluída' },
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
        cause: { type: 'string', enum: ['DELETE_RELATIONSHIP_ERROR'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};
