import type { FastifySchema } from 'fastify';

export const EmptyTrashSchema: FastifySchema = {
  tags: ['Tabelas'],
  summary: 'Esvaziar lixeira - excluir todas as tabelas na lixeira',
  description:
    'Exclui permanentemente todas as tabelas na lixeira, incluindo seus campos e coleções dinâmicas. Esta ação não pode ser desfeita.',
  security: [{ cookieAuth: [] }],
  response: {
    200: {
      description: 'Lixeira esvaziada com sucesso',
      type: 'object',
      properties: {
        deleted: {
          type: 'number',
          description: 'Quantidade de tabelas excluídas permanentemente',
        },
      },
    },
    401: {
      description: 'Não autenticado - Autenticação necessária',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [401] },
        cause: {
          type: 'string',
          enum: ['AUTHENTICATION_REQUIRED', 'USER_NOT_AUTHENTICATED'],
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
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
          enum: [
            'USER_NOT_FOUND',
            'USER_NOT_ACTIVE',
            'PERMISSIONS_NOT_FOUND',
            'INSUFFICIENT_PERMISSIONS',
          ],
        },
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
        cause: { type: 'string', enum: ['EMPTY_TRASH_TABLES_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
