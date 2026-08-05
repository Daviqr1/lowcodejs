import type { FastifySchema } from 'fastify';

import { zodToRouteSchema } from '@application/core/schema.core';

import { ImportTableValidator } from './_shared.validator';

export const ImportTableSchema: FastifySchema = {
  tags: ['Tools'],
  summary: 'Import table',
  description: 'Imports a table from a previously exported JSON',
  security: [{ cookieAuth: [] }],
  body: zodToRouteSchema(ImportTableValidator),
  response: {
    201: {
      description: 'Table imported successfully',
      type: 'object',
      properties: {
        tableId: { type: 'string' },
        slug: { type: 'string' },
        importedFields: { type: 'number' },
        importedRows: { type: 'number' },
        importedMenus: { type: 'number' },
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
      },
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
  },
};
