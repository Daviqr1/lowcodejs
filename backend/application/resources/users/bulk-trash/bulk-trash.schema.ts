import type { FastifySchema } from 'fastify';

export const UserBulkTrashSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Enviar múltiplos usuários para a lixeira',
  description:
    'Move vários usuários para a lixeira de uma vez. O próprio usuário não pode ser enviado para a lixeira. Retorna o número de usuários modificados.',
  security: [{ cookieAuth: [] }],
  body: {
    type: 'object',
    required: ['ids'],
    properties: {
      ids: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        description: 'Lista de IDs de usuários a enviar para a lixeira',
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Usuários enviados para a lixeira com sucesso',
      type: 'object',
      properties: {
        modified: {
          type: 'number',
          description: 'Número de usuários enviados para a lixeira',
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
      description: 'Conflito - Não é possível enviar a si mesmo para a lixeira',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [409] },
        cause: { type: 'string', enum: ['CANNOT_TRASH_SELF'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    500: {
      description: 'Erro interno do servidor',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['BULK_TRASH_USERS_ERROR'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};
