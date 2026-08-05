import type { FastifySchema } from 'fastify';

import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import { GroupParamsValidator } from '../_shared.validator';

export const GroupFieldListSchema: FastifySchema = {
  tags: ['Campos de Grupo'],
  summary: 'Listar campos do grupo',
  description: 'Lista todos os campos dentro de um FIELD_GROUP.',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(GroupParamsValidator),
  response: {
    200: {
      description: 'Lista de campos do grupo',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          type: { type: 'string' },
          required: { type: 'boolean' },
          multiple: { type: 'boolean' },
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
                  kind: { type: 'string', enum: ['PUBLIC', 'NOBODY', 'GROUP'] },
                  group: { type: 'string', nullable: true },
                },
              },
              form: {
                type: 'object',
                properties: {
                  kind: { type: 'string', enum: ['PUBLIC', 'NOBODY', 'GROUP'] },
                  group: { type: 'string', nullable: true },
                },
              },
              detail: {
                type: 'object',
                properties: {
                  kind: { type: 'string', enum: ['PUBLIC', 'NOBODY', 'GROUP'] },
                  group: { type: 'string', nullable: true },
                },
              },
            },
          },
          widthInForm: { type: 'number', nullable: true },
          widthInList: { type: 'number', nullable: true },
          widthInDetail: { type: 'number', nullable: true },
          tip: { type: 'string', nullable: true },
          locked: { type: 'boolean' },
          native: { type: 'boolean' },
          label: {
            type: 'object',
            nullable: true,
            properties: {
              list: { type: 'string', nullable: true },
              filter: { type: 'string', nullable: true },
              form: { type: 'string', nullable: true },
              detail: { type: 'string', nullable: true },
            },
          },
          format: { type: 'string', nullable: true },
          defaultValue: {
            anyOf: [
              { type: 'string' },
              { type: 'array', items: { type: 'string' } },
              { type: 'null' },
            ],
          },
          dropdown: {
            type: 'array',
            nullable: true,
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                label: { type: 'string' },
                color: { type: 'string' },
              },
            },
          },
          allowCustomDropdownOptions: { type: 'boolean' },
          allowCreateRelationshipRecords: { type: 'boolean' },
          fillWithCurrentUserWhenEmpty: { type: 'boolean' },
          relationship: {
            type: 'object',
            nullable: true,
            properties: {
              table: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  slug: { type: 'string' },
                },
              },
              field: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  slug: { type: 'string' },
                },
              },
              order: { type: 'string', enum: ['asc', 'desc'] },
              customLabel: { type: 'boolean' },
              labelParts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    path: { type: 'string' },
                    label: { type: 'string' },
                  },
                },
              },
              labelSeparator: { type: 'string' },
            },
          },
          category: {
            type: 'array',
            nullable: true,
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                label: { type: 'string' },
                children: { type: 'array' },
              },
            },
          },
          group: {
            type: 'object',
            nullable: true,
            properties: {
              _id: { type: 'string' },
              slug: { type: 'string' },
            },
          },
          validations: {
            type: 'array',
            description: 'Regras de validação configuradas para o campo',
            items: {
              type: 'object',
              properties: {
                rule: { type: 'string' },
                config: { type: 'object', additionalProperties: true },
              },
            },
          },
          trashed: { type: 'boolean' },
          trashedAt: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    400: buildErrorResponse(
      400,
      ['INVALID_PAYLOAD_FORMAT', 'INVALID_PARAMETERS'],
      {
        description: 'Requisição inválida - parâmetros inválidos',
      },
    ),
    401: buildErrorResponse(
      401,
      ['AUTHENTICATION_REQUIRED', 'USER_NOT_AUTHENTICATED'],
      {
        description: 'Não autorizado - autenticação necessária',
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
        description: 'Proibido - permissões insuficientes',
      },
    ),
    404: buildErrorResponse(404, ['TABLE_NOT_FOUND', 'GROUP_NOT_FOUND'], {
      description: 'Tabela ou grupo não encontrado',
    }),
    500: buildErrorResponse(500, 'LIST_GROUP_FIELDS_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
