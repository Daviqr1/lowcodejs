import type { FastifySchema } from 'fastify';

export const UserGroupDeleteSchema: FastifySchema = {
  tags: ['Grupos de Usuários'],
  summary: 'Excluir grupo permanentemente',
  description:
    'Exclui permanentemente um grupo que esteja na lixeira. Bloqueia grupos do sistema e grupos com usuários atribuídos. Restrito ao MASTER.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['_id'],
    properties: { _id: { type: 'string', minLength: 1 } },
  },
  response: {
    200: {
      description: 'Grupo excluído permanentemente com sucesso',
      type: 'null',
    },
    401: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [401] },
        cause: { type: 'string', enum: ['AUTHENTICATION_REQUIRED'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    403: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [403] },
        cause: {
          type: 'string',
          enum: ['FORBIDDEN', 'SYSTEM_GROUP_PROTECTED'],
        },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    404: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [404] },
        cause: { type: 'string', enum: ['USER_GROUP_NOT_FOUND'] },
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
          enum: ['NOT_TRASHED', 'GROUP_HAS_USERS'],
        },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    500: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['DELETE_GROUP_ERROR'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};
