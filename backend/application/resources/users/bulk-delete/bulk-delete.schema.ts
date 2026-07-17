import type { FastifySchema } from 'fastify';

export const UserBulkDeleteSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Excluir permanentemente múltiplos usuários',
  description:
    'Exclui permanentemente vários usuários que já estejam na lixeira. O próprio usuário não pode ser excluído e usuários com tabelas associadas são ignorados. Retorna o número de usuários excluídos.',
  security: [{ cookieAuth: [] }],
  body: {
    type: 'object',
    required: ['ids'],
    properties: {
      ids: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        description: 'Lista de IDs de usuários a excluir permanentemente',
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Usuários excluídos permanentemente com sucesso',
      type: 'object',
      properties: {
        deleted: {
          type: 'number',
          description: 'Número de usuários excluídos permanentemente',
        },
      },
    },
    400: {
      description: 'Requisição inválida - Parâmetros inválidos',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [400] },
        cause: {
          type: 'string',
          enum: ['INVALID_PAYLOAD_FORMAT', 'INVALID_PARAMETERS'],
        },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
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
    409: {
      description: 'Conflito - Não é possível excluir a si mesmo',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [409] },
        cause: { type: 'string', enum: ['CANNOT_DELETE_SELF'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    500: {
      description: 'Erro interno do servidor',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['BULK_DELETE_USERS_ERROR'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};
