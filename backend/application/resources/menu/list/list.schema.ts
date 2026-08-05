import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

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
          // Vem populado do repositorio; declarado como `string` era
          // serializado literalmente como "[object Object]".
          owner: {
            type: 'object',
            nullable: true,
            description: 'Criador do menu',
            properties: {
              _id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
            },
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
          // Sem declarar, o serializador remove: a sidebar nunca recebia o
          // ícone e o form de edição recarregava `extension` como undefined,
          // apagando o vínculo no PATCH seguinte.
          icon: {
            type: 'string',
            nullable: true,
            description: 'URL da imagem usada como ícone',
          },
          extension: {
            type: 'object',
            nullable: true,
            properties: {
              pkg: { type: 'string' },
              extensionId: { type: 'string' },
            },
            description: 'Referência a um módulo de extensão',
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
    401: buildErrorResponse(401, 'AUTHENTICATION_REQUIRED', {
      description: 'Não autorizado - Autenticação necessária',
      message: 'Autenticação necessária',
    }),
    500: buildErrorResponse(500, 'LIST_MENU_ERROR', {
      description: 'Erro interno do servidor',
      message: 'Erro interno do servidor',
    }),
  },
};
