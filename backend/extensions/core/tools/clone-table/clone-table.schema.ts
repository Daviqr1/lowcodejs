import type { FastifySchema } from 'fastify';

import { zodToRouteSchema } from '@application/core/schema.core';
import { buildErrorResponse } from '@application/core/schema.core';

import { CloneTableValidator } from './clone-table.validator';

export const CloneTableSchema: FastifySchema = {
  tags: ['Tools'],
  summary: 'Clone table',
  description:
    'Clones one or more tables using table IDs and an optional name/prefix',
  security: [{ cookieAuth: [] }],
  body: zodToRouteSchema(CloneTableValidator),
  response: {
    201: {
      description: 'Table cloned successfully',
      type: 'object',
      properties: {
        tableId: { type: 'string', description: 'New table ID' },
        slug: { type: 'string', description: 'New table slug' },
        tables: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tableId: { type: 'string' },
              slug: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
        fieldIdMap: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'Map of old field IDs to new field IDs',
        },
        fieldIdMaps: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            additionalProperties: { type: 'string' },
          },
          description: 'Map of base table IDs to field ID maps',
        },
      },
    },
    409: buildErrorResponse(409, 'TABLE_ALREADY_EXISTS', {
      description: 'Conflict - Table with same slug already exists',
      errorsDescription: 'Field-specific validation errors',
    }),
    400: buildErrorResponse(400, 'INVALID_PAYLOAD_FORMAT', {
      description: 'Bad request - Zod validation failed',
      messageDescription: 'Specific validation error',
      errorsDescription: 'Field-specific validation errors',
    }),
    401: buildErrorResponse(401, 'AUTHENTICATION_REQUIRED', {
      description: 'Unauthorized - Authentication required',
      message: 'Unauthorized',
    }),
    404: buildErrorResponse(404, 'TABLE_NOT_FOUND', {
      description: 'Table not found',
      message: 'Tabela base não encontrada',
    }),
    500: buildErrorResponse(500, 'CLONE_TABLE_ERROR', {
      description: 'Internal server error - Database or server issues',
      message: 'Erro ao clonar tabela',
    }),
  },
};
