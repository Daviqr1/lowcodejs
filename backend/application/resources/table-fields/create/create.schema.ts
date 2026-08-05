import type { FastifySchema } from 'fastify';

import { FIELD_TYPE_ALL_VALUES } from '@application/core/entity.core';
import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import {
  TableFieldCreateBodyValidator,
  TableSlugParamsValidator,
} from '../_shared.validator';

export const TableFieldCreateSchema: FastifySchema = {
  tags: ['Campos'],
  summary: 'Criar campo',
  description:
    'Cria um novo campo em uma tabela. O título de exibição é armazenado em name, enquanto slug é a chave técnica segura. Se slug for omitido, a API o gera a partir de name. Para o tipo FIELD_GROUP, cria um novo grupo de campos.',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(TableSlugParamsValidator),
  body: zodToRouteSchema(TableFieldCreateBodyValidator),
  response: {
    201: {
      description:
        'Campo criado com sucesso, com slug gerado e schema da tabela atualizado',
      type: 'object',
      properties: {
        _id: { type: 'string', description: 'ID do campo' },
        name: { type: 'string', description: 'Nome do campo' },
        slug: { type: 'string', description: 'Slug gerado do campo' },
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
        htmlContent: {
          type: 'string',
          nullable: true,
          description: 'Conteúdo HTML do campo',
        },
        trashed: {
          type: 'boolean',
          enum: [false],
          description: 'Campo não está na lixeira',
        },
        trashedAt: {
          type: 'string',
          nullable: true,
          description:
            'Quando o campo foi enviado para a lixeira (null para campos novos)',
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
      ],
      {
        description: 'Acesso negado - Permissões insuficientes',
      },
    ),
    404: buildErrorResponse(404, 'TABLE_NOT_FOUND', {
      description: 'Tabela não encontrada',
    }),
    409: buildErrorResponse(
      409,
      ['FIELD_ALREADY_EXIST', 'DROPDOWN_OPTION_ALREADY_EXISTS'],
      {
        description:
          'Conflito - Campo já existe ou opções de dropdown duplicadas',
      },
    ),
    500: buildErrorResponse(500, 'CREATE_FIELD_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
