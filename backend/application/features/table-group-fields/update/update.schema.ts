import type { FastifySchema } from 'fastify';

import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import {
  GroupFieldParamsValidator,
  GroupFieldUpdateBodyValidator,
} from '../_shared.validator';

export const GroupFieldUpdateSchema: FastifySchema = {
  tags: ['Campos de Grupo'],
  summary: 'Atualizar campo no grupo',
  description:
    'Atualiza um campo existente dentro de um FIELD_GROUP. Alterar o name muda apenas o título de exibição. Alterações no slug de campos de grupo estão atualmente bloqueadas para proteger os dados aninhados existentes.',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(GroupFieldParamsValidator),
  body: zodToRouteSchema(GroupFieldUpdateBodyValidator),
  response: {
    200: {
      description: 'Campo atualizado com sucesso',
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
        visibleChipsLimit: { type: 'number', nullable: true },
        tip: { type: 'string', nullable: true },
        locked: { type: 'boolean' },
        native: { type: 'boolean' },
        label: {
          type: 'object',
          nullable: true,
          description: 'Rótulo customizado por contexto de exibição do campo',
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
    400: buildErrorResponse(
      400,
      [
        'INVALID_PAYLOAD_FORMAT',
        'INVALID_PARAMETERS',
        'INVALID_TABLE_SLUG',
        'INVALID_FIELD_SLUG',
      ],
      {
        description: 'Requisição inválida - parâmetros ou slug inválidos',
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
        'NATIVE_FIELD_CANNOT_BE_TRASHED',
        'FIELD_LOCKED',
      ],
      {
        description:
          'Proibido - permissão insuficiente ou campo nativo/bloqueado',
      },
    ),
    404: buildErrorResponse(
      404,
      ['TABLE_NOT_FOUND', 'GROUP_NOT_FOUND', 'FIELD_NOT_FOUND'],
      {
        description: 'Tabela, grupo ou campo não encontrado',
      },
    ),
    409: buildErrorResponse(
      409,
      ['FIELD_ALREADY_EXIST', 'DROPDOWN_OPTION_ALREADY_EXISTS'],
      {
        description: 'Conflito - campo ou opção de dropdown já existente',
      },
    ),
    500: buildErrorResponse(500, 'UPDATE_GROUP_FIELD_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
