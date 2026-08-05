import type { FastifySchema } from 'fastify';

import { zodToRouteSchema } from '@application/core/schema.core';

import { ExportTableValidator } from './export-table.validator';

export const ExportTableSchema: FastifySchema = {
  tags: ['Tools'],
  summary: 'Export table',
  description:
    'Exports one or more table structures and/or data as JSON (multi-table format v2)',
  security: [{ cookieAuth: [] }],
  body: zodToRouteSchema(ExportTableValidator),
  response: {
    200: {
      description: 'Table exported successfully',
      type: 'object',
      additionalProperties: true,
    },
    400: {
      description: 'Bad request',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number' },
        cause: { type: 'string' },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    404: {
      description: 'Table not found',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number' },
        cause: { type: 'string' },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
