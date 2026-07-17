import type { FastifySchema } from 'fastify';

export const UserGroupEmptyTrashSchema: FastifySchema = {
  tags: ['Grupos de Usuários'],
  summary: 'Esvaziar lixeira de grupos',
  description:
    'Exclui permanentemente todos os grupos na lixeira que não sejam do sistema e não possuam usuários atribuídos. Retorna a quantidade efetivamente removida. Restrito ao MASTER.',
  security: [{ cookieAuth: [] }],
  response: {
    200: {
      description: 'Quantidade de grupos excluídos da lixeira',
      type: 'object',
      properties: {
        deleted: { type: 'number', description: 'Total de grupos excluídos' },
      },
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
        cause: { type: 'string', enum: ['FORBIDDEN'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    500: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['EMPTY_TRASH_GROUPS_ERROR'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};
