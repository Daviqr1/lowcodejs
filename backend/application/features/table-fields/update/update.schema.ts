import type { FastifySchema } from 'fastify';

import { FIELD_TYPE_ALL_VALUES } from '@application/core/entity.core';
import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import {
  TableFieldParamsValidator,
  TableFieldUpdateBodyValidator,
} from '../_shared.validator';

export const TableFieldUpdateSchema: FastifySchema = {
  tags: ['Campos'],
  summary: 'Atualizar campo',
  description:
    'Atualiza um campo existente em uma tabela. Em campos não-nativos o `slug` (chave técnica/url) é editável e, ao mudar, renomeia os dados armazenados. Campos nativos têm slug fixo e só aceitam o `label`.',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(TableFieldParamsValidator),
  body: zodToRouteSchema(TableFieldUpdateBodyValidator),
  response: {
    200: {
      description: 'Campo atualizado com sucesso',
      type: 'object',
      properties: {
        _id: { type: 'string', description: 'ID do campo' },
        name: { type: 'string', description: 'Nome do campo' },
        slug: { type: 'string', description: 'Slug do campo' },
        type: {
          type: 'string',
          enum: FIELD_TYPE_ALL_VALUES,
          description: 'Tipo do campo',
        },
        required: { type: 'boolean', description: 'Campo é obrigatório' },
        multiple: {
          type: 'boolean',
          description: 'Campo aceita múltiplos valores',
        },
        showInFilter: {
          type: 'boolean',
          description: 'Permitir filtrar por este campo',
        },
        showInParentList: { type: 'boolean' },
        visibleInParentList: { type: 'boolean' },
        widthInForm: {
          type: 'number',
          nullable: true,
          description: 'Largura do campo nos formulários, inteiro 0-100 (%)',
        },
        widthInList: {
          type: 'number',
          nullable: true,
          description:
            'Largura do campo nas visualizações de lista/grade, inteiro 0-100 (px)',
        },
        widthInDetail: {
          type: 'number',
          nullable: true,
          description:
            'Largura do campo nas visualizações de detalhe, inteiro 0-100 (%)',
        },
        visibleChipsLimit: {
          type: 'number',
          nullable: true,
          description:
            'Limite de chips exibidos antes de resumir o restante em "+N" — aplicável aos campos DROPDOWN, RELATIONSHIP e USER quando multiple. null = sem limite, exibe todos os selecionados',
        },
        tip: {
          type: 'string',
          nullable: true,
          description: 'Texto de ajuda opcional exibido nos formulários',
        },
        locked: { type: 'boolean', description: 'Campo está bloqueado' },
        native: { type: 'boolean', description: 'Campo é nativo' },
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
        format: {
          type: 'string',
          nullable: true,
          description: 'Formato do campo',
        },
        defaultValue: {
          anyOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } },
            { type: 'null' },
          ],
          description: 'Valor padrão do campo',
        },
        dropdown: {
          type: 'array',
          nullable: true,
          description: 'Opções de dropdown',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              color: { type: 'string' },
              sortField: { type: 'string', nullable: true },
              sortDirection: {
                type: 'string',
                enum: ['asc', 'desc', null],
                nullable: true,
              },
            },
          },
        },
        allowCustomDropdownOptions: {
          type: 'boolean',
          description:
            'Permitir que usuários criem novas opções de seleção a partir do formulário',
        },
        allowCreateRelationshipRecords: {
          type: 'boolean',
          description:
            'Permitir que usuários criem registros na tabela relacionada a partir do formulário',
        },
        fillWithCurrentUserWhenEmpty: {
          type: 'boolean',
          description:
            'Campo USER: grava o usuário logado quando nenhum id de usuário é enviado no payload',
        },
        relationship: {
          type: 'object',
          nullable: true,
          additionalProperties: true,
          description: 'Configuração do relacionamento',
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
            visible: { type: 'boolean' },
            onDelete: {
              type: 'string',
              enum: ['CASCADE', 'SET_NULL', 'RESTRICT'],
            },
            mirror: {
              type: 'object',
              additionalProperties: true,
              properties: {
                multiple: { type: 'boolean' },
                visible: { type: 'boolean' },
                label: { type: 'string' },
              },
            },
            relationshipId: { type: 'string', nullable: true },
            formMode: {
              type: 'string',
              enum: ['select', 'manage'],
              nullable: true,
            },
            side: {
              type: 'string',
              enum: ['source', 'target'],
              nullable: true,
            },
            max: { type: 'number', nullable: true },
          },
        },
        category: {
          type: 'array',
          nullable: true,
          description: 'Opções de categoria',
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
          description: 'Configuração do grupo de campos',
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
        htmlContent: { type: 'string', nullable: true },
        trashed: {
          type: 'boolean',
          description: 'Campo está na lixeira',
        },
        trashedAt: {
          type: 'string',
          format: 'date-time',
          nullable: true,
          description: 'Quando o campo foi enviado para a lixeira',
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          description: 'Data/hora de criação',
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          description: 'Data/hora da última atualização',
        },
      },
    },
    400: buildErrorResponse(
      400,
      ['INVALID_PAYLOAD_FORMAT', 'INVALID_TABLE_SLUG', 'INVALID_FIELD_SLUG'],
      {
        description:
          'Requisição inválida - Falha na validação do payload ou slug/tabela inválidos',
      },
    ),
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
        'NATIVE_FIELD_CANNOT_BE_TRASHED',
        'FIELD_LOCKED',
      ],
      {
        description:
          'Acesso negado - Permissões insuficientes ou campo protegido',
      },
    ),
    404: buildErrorResponse(404, ['TABLE_NOT_FOUND', 'FIELD_NOT_FOUND'], {
      description: 'Tabela ou campo não encontrado',
    }),
    409: buildErrorResponse(
      409,
      [
        'LAST_ACTIVE_FIELD',
        'FIELD_ALREADY_EXIST',
        'DROPDOWN_OPTION_ALREADY_EXISTS',
      ],
      {
        description:
          'Conflito - Último campo ativo, campo já existe ou opções de dropdown duplicadas',
      },
    ),
    500: buildErrorResponse(500, 'UPDATE_FIELD_TABLE_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
