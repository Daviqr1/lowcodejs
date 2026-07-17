import type { FastifySchema } from 'fastify';

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
    409: {
      description: 'Conflict - Table with same slug already exists',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [409] },
        cause: { type: 'string', enum: ['TABLE_ALREADY_EXISTS'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'Field-specific validation errors',
        },
      },
    },
    400: {
      description: 'Bad request - Zod validation failed',
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Specific validation error',
        },
        code: { type: 'number', enum: [400] },
        cause: {
          type: 'string',
          enum: ['INVALID_PAYLOAD_FORMAT'],
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'Field-specific validation errors',
        },
      },
    },
    401: {
      description: 'Unauthorized - Authentication required',
      type: 'object',
      properties: {
        message: { type: 'string', enum: ['Unauthorized'] },
        code: { type: 'number', enum: [401] },
        cause: { type: 'string', enum: ['AUTHENTICATION_REQUIRED'] },
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
        message: { type: 'string', enum: ['Tabela base não encontrada'] },
        code: { type: 'number', enum: [404] },
        cause: { type: 'string', enum: ['TABLE_NOT_FOUND'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    500: {
      description: 'Internal server error - Database or server issues',
      type: 'object',
      properties: {
        message: { type: 'string', enum: ['Erro ao clonar tabela'] },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['CLONE_TABLE_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
