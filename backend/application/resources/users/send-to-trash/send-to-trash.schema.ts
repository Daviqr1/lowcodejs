import type { FastifySchema } from 'fastify';

export const UserSendToTrashSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Enviar usuário para a lixeira (soft delete)',
  description:
    'Envia um usuário para a lixeira (soft delete). Bloqueia auto-envio e impede que um ADMINISTRATOR envie um usuário MASTER para a lixeira.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['_id'],
    properties: {
      _id: {
        type: 'string',
        minLength: 1,
        description: 'ID do usuário a ser enviado para a lixeira',
      },
    },
  },
  response: {
    200: {
      type: 'null',
      description: 'Usuário enviado para a lixeira com sucesso',
    },
    401: {
      description: 'Não autorizado - Autenticação necessária',
      type: 'object',
      properties: {
        message: { type: 'string', enum: ['Autenticação necessária'] },
        code: { type: 'number', enum: [401] },
        cause: { type: 'string', enum: ['AUTHENTICATION_REQUIRED'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    403: {
      description: 'Acesso negado - Permissão insuficiente',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [403] },
        cause: {
          type: 'string',
          enum: ['FORBIDDEN', 'CANNOT_TRASH_MASTER'],
        },
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
      description: 'Conflito - Operação não permitida no estado atual',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [409] },
        cause: {
          type: 'string',
          enum: ['ALREADY_TRASHED', 'CANNOT_TRASH_SELF'],
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
        cause: { type: 'string', enum: ['SEND_USER_TO_TRASH_ERROR'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};
