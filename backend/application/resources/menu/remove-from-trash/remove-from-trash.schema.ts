import type { FastifySchema } from 'fastify';

export const MenuRemoveFromTrashSchema: FastifySchema = {
  tags: ['Menu'],
  summary: 'Remover menu da lixeira',
  description:
    'Restaura um item de menu da lixeira, tornando-o ativo novamente.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['_id'],
    properties: {
      _id: {
        type: 'string',
        minLength: 1,
        description: 'ID do menu',
        errorMessage: {
          type: 'O ID deve ser um texto',
          minLength: 'O ID é obrigatório',
        },
      },
    },
    errorMessage: {
      required: {
        _id: 'O ID é obrigatório',
      },
    },
  },
  response: {
    200: {
      description: 'Menu removido da lixeira com sucesso',
      type: 'null',
    },
    401: {
      description: 'Não autorizado - Autenticação necessária',
      type: 'object',
      properties: {
        message: { type: 'string', enum: ['Autenticação necessária'] },
        code: { type: 'number', enum: [401] },
        cause: { type: 'string', enum: ['AUTHENTICATION_REQUIRED'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    404: {
      description: 'Menu não encontrado',
      type: 'object',
      properties: {
        message: { type: 'string', enum: ['Menu não encontrado'] },
        code: { type: 'number', enum: [404] },
        cause: { type: 'string', enum: ['MENU_NOT_FOUND'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    409: {
      description: 'Menu não está na lixeira',
      type: 'object',
      properties: {
        message: { type: 'string', enum: ['Menu não está na lixeira'] },
        code: { type: 'number', enum: [409] },
        cause: { type: 'string', enum: ['NOT_TRASHED'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    500: {
      description: 'Erro interno do servidor',
      type: 'object',
      properties: {
        message: { type: 'string', enum: ['Erro interno do servidor'] },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['REMOVE_FROM_TRASH_MENU_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
