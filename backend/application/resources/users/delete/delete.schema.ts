import type { FastifySchema } from 'fastify';

export const UserDeleteSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Excluir usuário permanentemente',
  description:
    'Exclui permanentemente um usuário que esteja na lixeira (restrito ao perfil MASTER)',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['_id'],
    properties: {
      _id: { type: 'string', minLength: 1, description: 'ID do usuário' },
    },
  },
  response: {
    200: { type: 'null', description: 'Usuário excluído permanentemente' },
    401: {
      description: 'Não autorizado - Autenticação necessária',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [401] },
        cause: { type: 'string', enum: ['AUTHENTICATION_REQUIRED'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    403: {
      description: 'Proibido - Permissão insuficiente',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [403] },
        cause: { type: 'string', enum: ['FORBIDDEN'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    404: {
      description: 'Usuário não encontrado',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [404] },
        cause: { type: 'string', enum: ['USER_NOT_FOUND'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    409: {
      description: 'Conflito - Exclusão não permitida',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [409] },
        cause: {
          type: 'string',
          enum: ['NOT_TRASHED', 'CANNOT_DELETE_SELF', 'OWNER_OF_TABLES'],
        },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    500: {
      description: 'Erro interno do servidor',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['DELETE_USER_ERROR'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};
