import type { FastifySchema } from 'fastify';

import { zodToRouteSchema } from '@application/core/schema.core';

import {
  RelationshipIdParamsValidator,
  RelationshipLinkBodyValidator,
} from '../_shared.validator';

export const RelationshipLinkSchema: FastifySchema = {
  tags: ['Relacionamentos'],
  summary: 'Vincular registros',
  description:
    'Cria um vínculo (RelationshipLink) entre dois registros, pelos dois lados. `side` indica qual lado é a tabela do `:slug`; `recordId` é o registro deste lado e `otherId` o do outro. Aplica as regras de cardinalidade (canLink).',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(RelationshipIdParamsValidator),
  body: zodToRouteSchema(RelationshipLinkBodyValidator),
  response: {
    201: {
      description: 'Vínculo criado',
      type: 'object',
      additionalProperties: true,
    },
    400: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [400] },
        cause: {
          type: 'string',
          enum: ['RELATIONSHIP_SELF_LINK', 'RELATIONSHIP_NOT_PIVOT'],
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
          enum: ['RELATIONSHIP_NOT_FOUND', 'RELATIONSHIP_FIELD_NOT_FOUND'],
        },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    409: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [409] },
        cause: {
          type: 'string',
          enum: [
            'RELATIONSHIP_LINK_DUPLICATE',
            'RELATIONSHIP_SOURCE_LIMIT',
            'RELATIONSHIP_TARGET_LIMIT',
          ],
        },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    500: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['LINK_RELATIONSHIP_ERROR'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};
