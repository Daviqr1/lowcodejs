import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const CloneTableSchema: FastifySchema = {
  tags: ['Tools'],
  summary: 'Clone table',
  description:
    'Clones one or more tables using table IDs and an optional name/prefix',
  security: [{ cookieAuth: [] }],
  body: {
    type: 'object',
    anyOf: [{ required: ['baseTableId'] }, { required: ['baseTableIds'] }],
    properties: {
      baseTableId: {
        type: 'string',
        minLength: 1,
        description: 'ID of the base table',
        errorMessage: {
          type: 'O ID da tabela base deve ser um texto',
          minLength: 'O ID da tabela base é obrigatório',
        },
      },
      baseTableIds: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'string',
          minLength: 1,
        },
        description: 'IDs of base tables for batch cloning',
      },
      copyDataTableIds: {
        type: 'array',
        items: {
          type: 'string',
          minLength: 1,
        },
        description: 'Base table IDs whose row data should be copied',
      },
      name: {
        type: 'string',
        description:
          'Name of the new table for single clone, or prefix for batch clone',
        errorMessage: {
          type: 'O nome da nova tabela deve ser um texto',
        },
      },
    },
    additionalProperties: false,
    errorMessage: {
      required: {
        baseTableId: 'O ID da tabela base é obrigatório',
      },
      additionalProperties: 'Campos extras não são permitidos',
    },
  },
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
