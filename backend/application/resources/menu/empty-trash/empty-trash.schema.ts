import type { FastifySchema } from 'fastify';

export const MenuEmptyTrashSchema: FastifySchema = {
  tags: ['Menu'],
  summary: 'Esvaziar lixeira de menus',
  description: 'Remove permanentemente todos os menus que estão na lixeira.',
  security: [{ cookieAuth: [] }],
  response: {
    200: {
      description: 'Lixeira esvaziada com sucesso',
      type: 'object',
      properties: {
        deleted: {
          type: 'number',
          description: 'Quantidade de menus removidos permanentemente',
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
    403: {
      description: 'Proibido - Permissão insuficiente',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [403] },
        cause: { type: 'string', enum: ['FORBIDDEN'] },
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
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['EMPTY_TRASH_MENUS_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
