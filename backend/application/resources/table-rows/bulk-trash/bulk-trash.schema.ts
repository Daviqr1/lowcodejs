import type { FastifySchema } from 'fastify';

export const BulkTrashSchema: FastifySchema = {
  tags: ['Rows'],
  summary: 'Bulk send rows to trash',
  description:
    'Moves multiple rows to trash by setting trashed=true and trashedAt timestamp. The rows can be restored later or permanently deleted.',
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
    required: ['ids'],
    properties: {
      ids: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        description: 'Array of row IDs to move to trash',
        examples: [['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012']],
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Rows moved to trash successfully',
      type: 'object',
      properties: {
        deleted: {
          type: 'number',
          description: 'Number of rows successfully moved to trash',
        },
        skipped: {
          type: 'array',
          description:
            'Rows that were not moved to trash (not found or blocked by row-access guards). Each entry includes the rowId and reason (NOT_FOUND, ROW_ACCESS_DENIED, or guard-specific cause).',
          items: {
            type: 'object',
            properties: {
              rowId: { type: 'string' },
              reason: { type: 'string' },
            },
            required: ['rowId', 'reason'],
          },
        },
      },
      required: ['deleted', 'skipped'],
    },
    400: {
      description: 'Bad request - Invalid parameters',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [400] },
        cause: { type: 'string', enum: ['INVALID_PARAMETERS'] },
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
        cause: { type: 'string', enum: ['BULK_TRASH_ROWS_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
