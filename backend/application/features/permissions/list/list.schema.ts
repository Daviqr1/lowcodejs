import type { FastifySchema } from 'fastify';

export const PermissionListSchema: FastifySchema = {
  tags: ['Permissões'],
  summary: 'Listar permissões',
  description: 'Retorna a lista de todas as permissões disponíveis no sistema',
  security: [{ cookieAuth: [] }],
  response: {
    200: {
      description: 'Lista de todas as permissões',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          _id: { type: 'string', description: 'ID da permissão' },
          name: { type: 'string', description: 'Nome da permissão' },
          slug: { type: 'string', description: 'Slug da permissão' },
          description: {
            type: 'string',
            nullable: true,
            description: 'Descrição da permissão',
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
        message: { type: 'string', enum: ['Não autorizado'] },
        code: { type: 'number', enum: [401] },
        cause: { type: 'string', enum: ['AUTHENTICATION_REQUIRED'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
      examples: [
        {
          message: 'Não autorizado',
          code: 401,
          cause: 'AUTHENTICATION_REQUIRED',
        },
      ],
    },
    500: {
      description: 'Erro interno do servidor',
      type: 'object',
      properties: {
        message: { type: 'string', enum: ['Erro interno do servidor'] },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['LIST_PERMISSION_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
      examples: [
        {
          message: 'Erro interno do servidor',
          code: 500,
          cause: 'LIST_PERMISSION_ERROR',
        },
      ],
    },
  },
};
