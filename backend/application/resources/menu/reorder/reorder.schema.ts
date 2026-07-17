import type { FastifySchema } from 'fastify';

export const MenuReorderSchema: FastifySchema = {
  tags: ['Menu'],
  summary: 'Reordenar itens de menu',
  description:
    'Atualiza a ordem de múltiplos itens de menu que compartilham o mesmo pai',
  security: [{ cookieAuth: [] }],
  body: {
    type: 'object',
    required: ['items'],
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          required: ['_id', 'order'],
          properties: {
            _id: {
              type: 'string',
              minLength: 1,
              description: 'ID do item de menu',
            },
            order: {
              type: 'integer',
              minimum: 0,
              description: 'Nova posição do item',
            },
            parent: {
              type: 'string',
              nullable: true,
              description: 'ID do novo menu pai (opcional)',
            },
          },
        },
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Itens reordenados com sucesso',
      type: 'null',
    },
    400: {
      description: 'Requisição inválida - Falha na validação',
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Mensagem de erro' },
        code: { type: 'number', enum: [400] },
        cause: {
          type: 'string',
          enum: ['INVALID_PAYLOAD_FORMAT', 'INVALID_PARAMETERS'],
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
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
        message: { type: 'string', description: 'Mensagem de erro' },
        code: { type: 'number', enum: [404] },
        cause: { type: 'string', enum: ['MENU_NOT_FOUND'] },
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
        cause: { type: 'string', enum: ['REORDER_MENU_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
