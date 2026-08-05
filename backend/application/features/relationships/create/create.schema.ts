import type { FastifySchema } from 'fastify';

import { zodToRouteSchema } from '@application/core/schema.core';

import {
  RelationshipCreateBodyValidator,
  RelationshipSlugParamsValidator,
} from '../_shared.validator';

export const RelationshipCreateSchema: FastifySchema = {
  tags: ['Relacionamentos'],
  summary: 'Criar definição de relacionamento',
  description:
    'Cria uma RelationshipDefinition (fonte de verdade do vínculo) entre dois lados (source/target). A cardinalidade é derivada do field.multiple de cada lado.',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(RelationshipSlugParamsValidator),
  body: zodToRouteSchema(RelationshipCreateBodyValidator),
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
