import type { FastifySchema } from 'fastify';

export const MenuListSchema: FastifySchema = {
  tags: ['Menu'],
  summary: 'Listar todos os itens de menu',
  description: 'Retorna a lista completa de itens de menu sem paginação',
  security: [{ cookieAuth: [] }],
  response: {
    200: {
      description: 'Lista completa de itens de menu',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          _id: { type: 'string', description: 'ID do menu' },
          name: { type: 'string', description: 'Nome do menu' },
          slug: { type: 'string', description: 'Slug do menu' },
          type: { type: 'string', description: 'Tipo do menu' },
          parent: { type: 'string', nullable: true, description: 'ID do pai' },
          table: {
            type: 'string',
            nullable: true,
            description: 'ID da tabela',
          },
          owner: {
            type: 'string',
            nullable: true,
            description: 'ID do criador',
          },
          html: {
            type: 'string',
            nullable: true,
            description: 'Conteúdo HTML',
          },
          url: { type: 'string', nullable: true, description: 'URL' },
          order: { type: 'number', description: 'Ordem do menu' },
          isInitial: {
            type: 'boolean',
            description: 'Se é o menu inicial do sistema',
          },
          visibility: {
            type: 'object',
            nullable: true,
            description: 'Visibilidade da opção de menu (Grupo|Public|Nobody)',
            properties: {
              kind: { type: 'string', enum: ['PUBLIC', 'NOBODY', 'GROUP'] },
              group: { type: 'string', nullable: true },
            },
          },
          trashed: { type: 'boolean', description: 'Se está na lixeira' },
          trashedAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Data de envio para lixeira',
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
        cause: { type: 'string', enum: ['LIST_MENU_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
