import type { FastifySchema } from 'fastify';

export const UserBulkUpdateSchema: FastifySchema = {
  tags: ['Users'],
  summary: 'Bulk update user status',
  description:
    'Sets the same status (ACTIVE/INACTIVE) on multiple users at once. The acting user is always excluded (cannot change own status). Returns the number of users modified.',
  security: [{ cookieAuth: [] }],
  body: {
    type: 'object',
    required: ['ids', 'status'],
    properties: {
      ids: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 500,
        description: 'Array of user IDs to update',
      },
      status: {
        type: 'string',
        enum: ['ACTIVE', 'INACTIVE'],
        description: 'New status applied to all selected users',
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Users updated successfully',
      type: 'object',
      properties: {
        modified: {
          type: 'number',
          description: 'Number of users whose status was updated',
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
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    401: {
      description: 'Unauthorized - Authentication required',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [401] },
        cause: { type: 'string', enum: ['AUTHENTICATION_REQUIRED'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    403: {
      description: 'Forbidden - Insufficient role',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [403] },
        cause: { type: 'string' },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    500: {
      description: 'Internal server error',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['BULK_UPDATE_USERS_ERROR'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};
