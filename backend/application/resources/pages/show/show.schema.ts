import type { FastifySchema } from 'fastify';

import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import { PageShowParamsValidator } from './show.validator';

export const PageShowSchema: FastifySchema = {
  tags: ['Páginas'],
  summary: 'Buscar página por slug',
  description: 'Retorna uma página específica pelo slug para renderização',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(PageShowParamsValidator),
  response: {
    200: {
      description: 'Página encontrada com sucesso',
      type: 'object',
      properties: {
        _id: { type: 'string', description: 'ID da página' },
        name: { type: 'string', description: 'Nome da página' },
        slug: { type: 'string', description: 'Slug da página' },
        type: {
          type: 'string',
          enum: ['TABLE', 'FORM', 'PAGE', 'EXTERNAL', 'SEPARATOR', 'SECTION'],
          description: 'Tipo do item de menu',
        },
        table: {
          type: 'string',
          nullable: true,
          description: 'ID da tabela (quando tipo é TABLE)',
        },
        parent: {
          type: 'string',
          nullable: true,
          description: 'ID do menu pai',
        },
        url: {
          type: 'string',
          nullable: true,
          description: 'URL externa (quando tipo é EXTERNAL)',
        },
        html: {
          type: 'string',
          nullable: true,
          description: 'Conteúdo HTML da página (quando tipo é PAGE)',
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    401: buildErrorResponse(401, 'AUTHENTICATION_REQUIRED', {
      description: 'Não autorizado - Autenticação necessária',
      message: 'Não autorizado',
    }),
    404: {
      description: 'Página não encontrada',
      type: 'object',
      properties: {
        message: { type: 'string', enum: ['Página não encontrada'] },
        code: { type: 'number', enum: [404] },
        cause: { type: 'string', enum: ['PAGE_NOT_FOUND'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
      examples: [
        {
          message: 'Página não encontrada',
          code: 404,
          cause: 'PAGE_NOT_FOUND',
        },
      ],
    },
    500: buildErrorResponse(500, 'GET_MENU_ERROR', {
      description: 'Erro interno do servidor',
      message: 'Erro interno do servidor',
    }),
  },
};
