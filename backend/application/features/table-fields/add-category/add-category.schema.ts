import type { FastifySchema } from 'fastify';

import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import {
  TableFieldAddCategoryBodyValidator,
  TableFieldParamsValidator,
} from '../_shared.validator';

export const TableFieldAddCategorySchema: FastifySchema = {
  tags: ['Campos'],
  summary: 'Adicionar opção de categoria',
  description:
    'Adiciona uma nova opção de categoria a um campo do tipo CATEGORY, na raiz ou como filha de uma categoria existente.',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(TableFieldParamsValidator),
  body: zodToRouteSchema(TableFieldAddCategoryBodyValidator),
  response: {
    200: {
      description: 'Opção de categoria criada com sucesso',
      type: 'object',
      properties: {
        node: {
          type: 'object',
          description: 'Nó de categoria criado',
          properties: {
            id: { type: 'string' },
            label: { type: 'string' },
            parentId: { type: 'string', nullable: true },
          },
        },
        field: {
          type: 'object',
          description: 'Campo atualizado',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
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
            visibleChipsLimit: { type: 'number', nullable: true },
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
      ['TABLE_NOT_FOUND', 'FIELD_NOT_FOUND', 'PARENT_CATEGORY_NOT_FOUND'],
      {
        description:
          'Não encontrado - Tabela, campo ou categoria pai não existe',
      },
    ),
    500: buildErrorResponse(500, 'ADD_CATEGORY_OPTION_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
