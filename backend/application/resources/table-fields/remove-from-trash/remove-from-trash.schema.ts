import type { FastifySchema } from 'fastify';

import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import { TableFieldParamsValidator } from '../_shared.validator';

export const TableFieldRemoveFromTrashSchema: FastifySchema = {
  tags: ['Campos'],
  summary: 'Restaurar campo da lixeira',
  description:
    'Restaura um campo da lixeira definindo trashed=false e reabilitando as propriedades de exibição, formulário, detalhe e filtro. Reconstrói o schema da tabela.',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(TableFieldParamsValidator),
  response: {
    200: {
      description: 'Campo restaurado da lixeira com sucesso',
      type: 'object',
      properties: {
        _id: { type: 'string', description: 'ID do campo' },
        name: { type: 'string', description: 'Nome do campo' },
        slug: { type: 'string', description: 'Slug do campo' },
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
        type: { type: 'string', description: 'Tipo do campo' },
        required: { type: 'boolean', description: 'Campo obrigatório' },
        multiple: {
          type: 'boolean',
          description: 'Campo aceita múltiplos valores',
        },
        format: { type: 'string', nullable: true, description: 'Formato' },
        showInFilter: { type: 'boolean', description: 'Disponível em filtros' },
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
        locked: { type: 'boolean', description: 'Campo bloqueado' },
        native: { type: 'boolean', description: 'Campo nativo' },
        defaultValue: {
          anyOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } },
            { type: 'null' },
          ],
          description: 'Valor padrão do campo',
        },
        relationship: { type: 'object', nullable: true },
        dropdown: { type: 'array', nullable: true },
        category: { type: 'array', nullable: true },
        group: { type: 'object', nullable: true },
        trashed: { type: 'boolean', description: 'Está na lixeira' },
        trashedAt: {
          type: 'string',
          format: 'date-time',
          nullable: true,
          description: 'Data de envio para a lixeira (null após restaurar)',
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    400: buildErrorResponse(400, 'INVALID_PAYLOAD_FORMAT', {
      description: 'Requisição inválida - Falha na validação do payload',
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
    404: buildErrorResponse(404, ['TABLE_NOT_FOUND', 'FIELD_NOT_FOUND'], {
      description: 'Não encontrado - Tabela ou campo não existe',
    }),
    409: buildErrorResponse(409, 'NOT_TRASHED', {
      description: 'Conflito - Campo não está na lixeira',
    }),
    500: buildErrorResponse(500, 'REMOVE_FIELD_FROM_TRASH_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
