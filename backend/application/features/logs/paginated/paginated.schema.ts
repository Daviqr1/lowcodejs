import type { FastifySchema } from 'fastify';

import {
  E_LOGGER_ACTION_TYPE,
  E_LOGGER_OBJECT_TYPE,
} from '@application/core/entity.core';
import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import { LoggerPaginatedQueryValidator } from '../_shared.validator';

export const LoggerPaginatedSchema: FastifySchema = {
  tags: ['Logs'],
  summary: 'Listar logs com paginação',
  description:
    'Retorna uma lista paginada de registros de log com busca e filtro de lixeira opcionais',
  security: [{ cookieAuth: [] }],
  querystring: zodToRouteSchema(LoggerPaginatedQueryValidator),
  response: {
    200: {
      description: 'Lista paginada de registros de log',
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              url: {
                type: 'string',
                description: 'URL que originou o registro de log',
              },
              user: {
                type: 'object',
                nullable: true,
                description: 'Usuário que executou a ação (nullable)',
                properties: {
                  _id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                },
              },
              action: {
                type: 'string',
                description: 'Tipo de ação executada',
                examples: Object.values(E_LOGGER_ACTION_TYPE),
              },
              object: {
                type: 'string',
                description: 'Tipo de objeto afetado pela ação',
                examples: Object.values(E_LOGGER_OBJECT_TYPE),
              },
              object_id: {
                type: ['string', 'null'],
                description: 'ID do objeto afetado (nullable)',
              },
              content: {
                description:
                  'Conteúdo/payload adicional do registro (nullable, qualquer tipo)',
                nullable: true,
              },
              creator: {
                type: 'object',
                nullable: true,
                description:
                  'Usuário que criou o registro referenciado (nullable)',
                properties: {
                  _id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                },
              },
              updater: {
                type: 'object',
                nullable: true,
                description:
                  'Usuário que modificou por último o registro referenciado (nullable)',
                properties: {
                  _id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                },
              },
              objectCreatedAt: {
                type: ['string', 'null'],
                format: 'date-time',
                description:
                  'Quando o registro referenciado foi criado (nullable)',
              },
              objectUpdatedAt: {
                type: ['string', 'null'],
                format: 'date-time',
                description:
                  'Quando o registro referenciado foi modificado por último (nullable)',
              },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            perPage: { type: 'number' },
            page: { type: 'number' },
            lastPage: { type: 'number' },
            firstPage: { type: 'number' },
          },
        },
      },
    },
    401: buildErrorResponse(401, 'AUTHENTICATION_REQUIRED', {
      description: 'Não autorizado - Autenticação necessária',
    }),
    500: buildErrorResponse(500, 'LIST_LOG_PAGINATED_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
