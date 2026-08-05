import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const TableFieldDeleteCategorySchema: FastifySchema = {
  tags: ['Campos'],
  summary: 'Excluir opção de categoria',
  description:
    'Remove uma opção de categoria (e seus descendentes) da árvore de um campo do tipo CATEGORY e desvincula a referência de todos os registros que a utilizam.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['slug', '_id', 'categoryId'],
    properties: {
      slug: {
        type: 'string',
        description: 'Slug da tabela que contém o campo',
      },
      _id: {
        type: 'string',
        description: 'ID do campo que contém a categoria',
      },
      categoryId: {
        type: 'string',
        description: 'ID do nó de categoria a ser removido',
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Opção de categoria removida com sucesso',
      type: 'object',
      properties: {
        field: {
          type: 'object',
          description: 'Campo atualizado',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            label: {
              type: 'object',
              nullable: true,
              description:
                'Rótulo customizado por contexto de exibição do campo',
              properties: {
                list: { type: 'string', nullable: true },
                filter: { type: 'string', nullable: true },
                form: { type: 'string', nullable: true },
                detail: { type: 'string', nullable: true },
              },
            },
            type: { type: 'string' },
            required: { type: 'boolean' },
            multiple: { type: 'boolean' },
            format: { type: 'string', nullable: true },
            showInFilter: { type: 'boolean' },
            showInParentList: { type: 'boolean' },
            visibleInParentList: { type: 'boolean' },
            permissions: {
              type: 'object',
              nullable: true,
              properties: {
                list: {
                  type: 'object',
                  properties: {
                    kind: {
                      type: 'string',
                      enum: ['PUBLIC', 'NOBODY', 'GROUP'],
                    },
                    group: { type: 'string', nullable: true },
                  },
                },
                form: {
                  type: 'object',
                  properties: {
                    kind: {
                      type: 'string',
                      enum: ['PUBLIC', 'NOBODY', 'GROUP'],
                    },
                    group: { type: 'string', nullable: true },
                  },
                },
                detail: {
                  type: 'object',
                  properties: {
                    kind: {
                      type: 'string',
                      enum: ['PUBLIC', 'NOBODY', 'GROUP'],
                    },
                    group: { type: 'string', nullable: true },
                  },
                },
              },
            },
            widthInForm: { type: 'number', nullable: true },
            widthInList: { type: 'number', nullable: true },
            widthInDetail: { type: 'number', nullable: true },
            locked: { type: 'boolean' },
            native: { type: 'boolean' },
            defaultValue: {
              anyOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } },
                { type: 'null' },
              ],
            },
            relationship: { type: 'object', nullable: true },
            dropdown: { type: 'array', nullable: true },
            category: { type: 'array', nullable: true },
            group: { type: 'object', nullable: true },
          },
        },
        removedIds: {
          type: 'array',
          description: 'IDs do nó removido e de todos os seus descendentes',
          items: { type: 'string' },
        },
      },
    },
    400: buildErrorResponse(400, 'INVALID_FIELD_TYPE', {
      description: 'Requisição inválida - Tipo de campo inválido',
    }),
    401: buildErrorResponse(
      401,
      ['AUTHENTICATION_REQUIRED', 'USER_NOT_AUTHENTICATED'],
      {
        description: 'Não autorizado - Autenticação necessária',
      },
    ),
    403: buildErrorResponse(
      403,
      [
        'USER_NOT_FOUND',
        'USER_NOT_ACTIVE',
        'PERMISSIONS_NOT_FOUND',
        'INSUFFICIENT_PERMISSIONS',
        'OWNER_OR_ADMIN_REQUIRED',
      ],
      {
        description: 'Acesso negado - Permissões insuficientes',
      },
    ),
    404: buildErrorResponse(
      404,
      ['TABLE_NOT_FOUND', 'FIELD_NOT_FOUND', 'CATEGORY_NOT_FOUND'],
      {
        description: 'Não encontrado - Tabela, campo ou categoria não existe',
      },
    ),
    500: buildErrorResponse(500, 'DELETE_CATEGORY_OPTION_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
