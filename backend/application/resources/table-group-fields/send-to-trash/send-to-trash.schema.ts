import type { FastifySchema } from 'fastify';

import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import { GroupFieldParamsValidator } from '../_shared.validator';

export const GroupFieldSendToTrashSchema: FastifySchema = {
  tags: ['Campos de Grupo'],
  summary: 'Enviar campo do grupo para a lixeira',
  description:
    'Move um campo dentro de um FIELD_GROUP para a lixeira. Define trashed=true e desativa as propriedades de exibição.',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(GroupFieldParamsValidator),
  response: {
    200: {
      description: 'Campo enviado para a lixeira com sucesso',
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
        trashed: { type: 'boolean' },
        trashedAt: { type: 'string', format: 'date-time', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
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
    409: buildErrorResponse(409, 'ALREADY_TRASHED', {
      description: 'Campo já está na lixeira',
    }),
    500: buildErrorResponse(500, 'SEND_GROUP_FIELD_TO_TRASH_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
