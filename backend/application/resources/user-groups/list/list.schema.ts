import type { FastifySchema } from 'fastify';

export const UserGroupListSchema: FastifySchema = {
  tags: ['Grupos de Usuários'],
  summary: 'Listar todos os grupos de usuários',
  description:
    'Retorna a lista completa de todos os grupos de usuários sem paginação',
  security: [{ cookieAuth: [] }],
  response: {
    200: {
      description: 'Lista completa de grupos de usuários',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          _id: { type: 'string', description: 'ID do grupo' },
          name: { type: 'string', description: 'Nome do grupo' },
          slug: { type: 'string', description: 'Identificador único do grupo' },
          description: { type: 'string', description: 'Descrição do grupo' },
          permissions: {
            type: 'array',
            description: 'Permissões atribuídas ao grupo',
            items: {
              type: 'object',
              properties: {
                _id: { type: 'string', description: 'ID da permissão' },
                name: {
                  type: 'string',
                  description: 'Nome da permissão',
                },
                slug: {
                  type: 'string',
                  description: 'Slug da permissão',
                },
                description: {
                  type: 'string',
                  nullable: true,
                  description: 'Descrição da permissão',
                },
              },
            },
          },
          encompasses: {
            type: 'array',
            description: 'IDs dos grupos englobados',
            items: { type: 'string' },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
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
    500: {
      description: 'Erro interno do servidor',
      type: 'object',
      properties: {
        message: { type: 'string', enum: ['Erro interno do servidor'] },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['LIST_USER_GROUP_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
