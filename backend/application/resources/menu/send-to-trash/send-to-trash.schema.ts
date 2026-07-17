import type { FastifySchema } from 'fastify';

export const MenuSendToTrashSchema: FastifySchema = {
  tags: ['Menu'],
  summary: 'Enviar menu para a lixeira (soft delete)',
  description:
    'Move um item de menu para a lixeira. Impede exclusão de menus com filhos ativos.',
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
      description: 'Menu movido para lixeira com sucesso',
      type: 'null',
    },
    400: {
      description: 'Requisição inválida - Falha na validação',
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Mensagem de erro' },
        code: { type: 'number', enum: [400] },
        cause: { type: 'string', enum: ['INVALID_PAYLOAD_FORMAT'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'Erros de validação por campo',
        },
      },
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
      description: 'Menu possui filhos ativos',
      type: 'object',
      properties: {
        message: { type: 'string', enum: ['Menu possui filhos ativos'] },
        code: { type: 'number', enum: [409] },
        cause: { type: 'string', enum: ['MENU_HAS_CHILDREN'] },
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
        cause: { type: 'string', enum: ['SEND_TO_TRASH_MENU_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
