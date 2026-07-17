import type { FastifySchema } from 'fastify';

import {
  E_LOGGER_ACTION_TYPE,
  E_LOGGER_OBJECT_TYPE,
} from '@application/core/entity.core';

export const LoggerPaginatedSchema: FastifySchema = {
  tags: ['Logs'],
  summary: 'Listar logs com paginação',
  description:
    'Retorna uma lista paginada de registros de log com busca e filtro de lixeira opcionais',
  security: [{ cookieAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      page: {
        type: 'number',
        minimum: 1,
        default: 1,
        description: 'Número da página (começa em 1)',
        examples: [1, 2, 5],
      },
      perPage: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        default: 50,
        description: 'Quantidade de itens por página (máx 100)',
        examples: [10, 25, 50, 100],
      },
      search: {
        type: 'string',
        minLength: 1,
        description:
          'Termo de busca para filtrar logs por URL ou ID de objeto (opcional)',
        examples: ['/api/users', 'CREATE', '507f1f77bcf86cd799439011'],
      },
      trashed: {
        type: 'string',
        enum: ['true', 'false'],
        description: 'Filtrar logs na lixeira (opcional, default: ativos)',
        examples: ['true', 'false'],
      },
    },
  },
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
    401: {
      description: 'Não autorizado - Autenticação necessária',
      type: 'object',
      properties: {
        message: { type: 'string' },
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
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['LIST_LOG_PAGINATED_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
