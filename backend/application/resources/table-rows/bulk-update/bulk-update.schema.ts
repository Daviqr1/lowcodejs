import type { FastifySchema } from 'fastify';

export const BulkUpdateSchema: FastifySchema = {
  tags: ['Rows'],
  summary: 'Bulk update field values on rows',
  description:
    'Applies the same partial `data` payload to multiple rows in one request. Each row is updated through the single-row update flow (validation, password hashing, beforeSave script and mention notifications). Best-effort: rows that fail are reported in `errors` (id -> cause) and do not abort the batch.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['slug'],
    properties: {
      slug: {
        type: 'string',
        description: 'Table slug containing the rows',
        examples: ['users', 'products', 'blog-posts'],
      },
    },
    additionalProperties: false,
  },
  body: {
    type: 'object',
    required: ['ids', 'data'],
    properties: {
      ids: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 200,
        description: 'Array of row IDs to update',
        examples: [['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012']],
      },
      data: {
        type: 'object',
        minProperties: 1,
        additionalProperties: true,
        description:
          'Partial field map applied to every row (e.g. { "status": ["in-progress"] })',
        examples: [{ status: ['in-progress'] }],
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Rows updated (best-effort)',
      type: 'object',
      properties: {
        modified: {
          type: 'number',
          description: 'Number of rows successfully updated',
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'Map of row id -> failure cause for rows that failed',
        },
      },
    },
    400: {
      description: 'Bad request - Invalid parameters',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [400] },
        cause: { type: 'string' },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
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
    403: {
      description: 'Forbidden - Insufficient permissions',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [403] },
        cause: { type: 'string' },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    404: {
      description: 'Not found - Table does not exist',
      type: 'object',
      properties: {
        message: { type: 'string', enum: ['Table not found'] },
        code: { type: 'number', enum: [404] },
        cause: { type: 'string', enum: ['TABLE_NOT_FOUND'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    500: {
      description: 'Internal server error',
      type: 'object',
      properties: {
        message: { type: 'string', enum: ['Internal server error'] },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['BULK_UPDATE_ROWS_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
