import { FastifySchema } from 'fastify';

import { FIELD_TYPE_ALL_VALUES } from '@application/core/entity.core';
import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import {
  TableSlugParamsValidator,
  TableUpdateBodyValidator,
} from '../_shared.validator';

export const TableUpdateSchema: FastifySchema = {
  tags: ['Tabelas'],
  summary: 'Atualizar tabela',
  description:
    'Atualiza uma tabela existente: nome, estilo, permissões (binding por ação), convidados, dono, ordenação de campos e layout. Renomear o slug propaga para a coleção dinâmica e campos de relacionamento.',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(TableSlugParamsValidator),
  body: zodToRouteSchema(TableUpdateBodyValidator),
  response: {
    200: {
      description: 'Tabela atualizada com sucesso',
      type: 'object',
      properties: {
        _id: { type: 'string', description: 'ID da tabela' },
        name: { type: 'string', description: 'Nome da tabela' },
        description: {
          type: 'string',
          nullable: true,
          description: 'Descrição da tabela',
        },
        slug: { type: 'string', description: 'Slug de URL da tabela' },
        logo: {
          type: 'object',
          nullable: true,
          description: 'Detalhes de armazenamento do logo da tabela (populado)',
          properties: {
            _id: { type: 'string', description: 'ID de armazenamento' },
            url: { type: 'string', description: 'URL do arquivo' },
            filename: {
              type: 'string',
              description: 'Nome original do arquivo',
            },
            type: { type: 'string', description: 'Tipo MIME' },
          },
        },
        fields: {
          type: 'array',
          description: 'Campos da tabela',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string', description: 'ID do campo' },
              name: { type: 'string', description: 'Nome do campo' },
              slug: { type: 'string', description: 'Slug do campo' },
              label: {
                type: 'string',
                nullable: true,
                description: 'Rótulo customizado de exibição do campo',
              },
              type: {
                type: 'string',
                enum: FIELD_TYPE_ALL_VALUES,
                description: 'Tipo do campo',
              },
              required: {
                type: 'boolean',
                description: 'Se o campo é obrigatório',
              },
              multiple: {
                type: 'boolean',
                description: 'Permite múltiplos valores',
              },
              format: {
                type: 'string',
                nullable: true,
                description: 'Validação de formato do campo',
              },
              showInFilter: {
                type: 'boolean',
                description: 'Permitir filtragem',
              },
              showInParentList: { type: 'boolean' },
              visibleInParentList: { type: 'boolean' },
              widthInForm: {
                type: 'number',
                nullable: true,
                description:
                  'Largura do campo em formulários, inteiro 0-100 (%)',
              },
              widthInList: {
                type: 'number',
                nullable: true,
                description:
                  'Largura do campo em visualizações de lista/grade, inteiro 0-100 (px)',
              },
              widthInDetail: {
                type: 'number',
                nullable: true,
                description:
                  'Largura do campo em visualizações de detalhe, inteiro 0-100 (%)',
              },
              tip: {
                type: 'string',
                nullable: true,
                description:
                  'Texto de ajuda opcional exibido nos formulários de registro',
              },
              locked: {
                type: 'boolean',
                description: 'O campo está bloqueado e não pode ser modificado',
              },
              native: {
                type: 'boolean',
                description: 'O campo é nativo',
              },
              defaultValue: {
                anyOf: [
                  { type: 'string' },
                  { type: 'array', items: { type: 'string' } },
                  { type: 'null' },
                ],
                description: 'Valor padrão do campo',
              },
              relationship: {
                type: 'object',
                nullable: true,
                description: 'Configuração de relacionamento',
              },
              dropdown: {
                type: 'array',
                nullable: true,
                description: 'Opções de seleção',
              },
              allowCustomDropdownOptions: {
                type: 'boolean',
                description:
                  'Permite que usuários criem novas opções de seleção a partir do registro',
              },
              allowCreateRelationshipRecords: {
                type: 'boolean',
                description:
                  'Permite que usuários criem registros na tabela relacionada a partir do registro',
              },
              fillWithCurrentUserWhenEmpty: {
                type: 'boolean',
                description:
                  'Campo USER: grava o usuário logado quando nenhum id de usuário é enviado no payload',
              },
              category: {
                type: 'array',
                nullable: true,
                description: 'Opções de categoria',
              },
              group: {
                type: 'object',
                nullable: true,
                description: 'Configuração de grupo de campos',
              },
              htmlContent: { type: 'string', nullable: true },
              trashed: {
                type: 'boolean',
                description: 'Se o campo está na lixeira',
              },
              trashedAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                description: 'Quando o campo foi enviado para a lixeira',
              },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        style: {
          type: 'string',
          enum: [
            'GALLERY',
            'LIST',
            'DOCUMENT',
            'CARD',
            'MOSAIC',
            'KANBAN',
            'FORUM',
            'CALENDAR',
            'GANTT',
          ],
          description: 'Estilo de exibição',
        },
        owner: {
          type: 'object',
          description: 'Proprietário da tabela (populado)',
          properties: {
            _id: { type: 'string', description: 'ID do usuário' },
            name: { type: 'string', description: 'Nome do usuário' },
          },
        },
        permissions: {
          type: 'object',
          nullable: true,
          description:
            'Mapa de cada ação para um binding (Grupo|Public|Nobody)',
          additionalProperties: {
            type: 'object',
            properties: {
              kind: { type: 'string', enum: ['PUBLIC', 'NOBODY', 'GROUP'] },
              group: { type: 'string', nullable: true },
            },
          },
        },
        members: {
          type: 'array',
          description: 'Convidados da tabela e seus perfis',
          items: {
            type: 'object',
            properties: {
              user: { type: 'string', description: 'ID do usuário' },
              profile: {
                type: 'string',
                enum: ['OWNER', 'ADMIN', 'EDITOR', 'CONTRIBUTOR', 'VIEWER'],
              },
            },
          },
        },
        fieldOrderList: {
          type: 'array',
          items: { type: 'string' },
          description: 'Ordem dos campos na visualização em lista',
        },
        fieldOrderForm: {
          type: 'array',
          items: { type: 'string' },
          description: 'Ordem dos campos na visualização em formulário',
        },
        fieldOrderFilter: {
          type: 'array',
          items: { type: 'string' },
        },
        fieldOrderDetail: {
          type: 'array',
          items: { type: 'string' },
        },
        type: {
          type: 'string',
          enum: ['TABLE', 'FIELD_GROUP'],
          description: 'Tipo da tabela',
        },
        methods: {
          type: 'object',
          properties: {
            beforeSave: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  nullable: true,
                  description: 'Código a executar antes de salvar',
                },
              },
            },
            afterSave: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  nullable: true,
                  description: 'Código a executar depois de salvar',
                },
              },
            },
            onLoad: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  nullable: true,
                  description: 'Código a executar antes de salvar',
                },
              },
            },
          },
          description: 'Configuração de métodos da tabela',
        },
        groups: {
          type: 'array',
          description: 'Configuração de grupos de campos',
          items: {
            type: 'object',
            properties: {
              slug: { type: 'string', description: 'Slug do grupo' },
              name: { type: 'string', description: 'Nome do grupo' },
              fields: {
                type: 'array',
                description: 'Campos dentro do grupo',
                items: {
                  type: 'object',
                  properties: {
                    _id: { type: 'string' },
                    name: { type: 'string' },
                    slug: { type: 'string' },
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
                    type: { type: 'string' },
                    required: { type: 'boolean' },
                    multiple: { type: 'boolean' },
                    format: { type: 'string', nullable: true },
                    showInFilter: { type: 'boolean' },
                    showInParentList: { type: 'boolean' },
                    visibleInParentList: { type: 'boolean' },
                    widthInForm: { type: 'number', nullable: true },
                    widthInList: { type: 'number', nullable: true },
                    widthInDetail: { type: 'number', nullable: true },
                    tip: { type: 'string', nullable: true },
                    locked: { type: 'boolean' },
                    native: { type: 'boolean' },
                    defaultValue: {
                      anyOf: [
                        { type: 'string' },
                        { type: 'array', items: { type: 'string' } },
                        { type: 'null' },
                      ],
                    },
                    relationship: {
                      type: 'object',
                      nullable: true,
                      additionalProperties: true,
                    },
                    dropdown: {
                      type: 'array',
                      nullable: true,
                      items: { type: 'object', additionalProperties: true },
                    },
                    allowCustomDropdownOptions: { type: 'boolean' },
                    allowCreateRelationshipRecords: { type: 'boolean' },
                    fillWithCurrentUserWhenEmpty: { type: 'boolean' },
                    category: {
                      type: 'array',
                      nullable: true,
                      items: { type: 'object', additionalProperties: true },
                    },
                    group: {
                      type: 'object',
                      nullable: true,
                      additionalProperties: true,
                    },
                    htmlContent: { type: 'string', nullable: true },
                    trashed: { type: 'boolean' },
                    trashedAt: {
                      type: 'string',
                      format: 'date-time',
                      nullable: true,
                    },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                  },
                  additionalProperties: true,
                },
              },
              _schema: {
                type: 'object',
                description: 'Schema do grupo',
                additionalProperties: true,
              },
            },
          },
        },
        order: {
          type: 'object',
          description: 'Ordenação padrão dos registros da tabela',
          properties: {
            field: { type: 'string', nullable: true },
            direction: {
              type: 'string',
              enum: ['asc', 'desc'],
              nullable: true,
            },
          },
        },
        _schema: {
          type: 'object',
          description:
            'Schema MongoDB gerado a partir dos campos com as propriedades trashedAt e trashed',
          additionalProperties: true,
        },
        rowSlugFieldId: {
          type: 'string',
          nullable: true,
          description:
            'ID do campo usado para gerar slugs amigáveis de registro',
        },
        trashed: {
          type: 'boolean',
          description: 'Se a tabela está na lixeira',
        },
        trashedAt: {
          type: 'string',
          format: 'date-time',
          nullable: true,
          description: 'Quando a tabela foi enviada para a lixeira',
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
    401: buildErrorResponse(
      401,
      ['AUTHENTICATION_REQUIRED', 'USER_NOT_AUTHENTICATED'],
      {
        description: 'Não autenticado - Autenticação necessária',
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
        'OWNER_CHANGE_FORBIDDEN',
        'TABLE_PRIVATE',
      ],
      {
        description: 'Acesso negado - Permissão insuficiente',
      },
    ),
    404: buildErrorResponse(404, 'TABLE_NOT_FOUND', {
      description: 'Tabela não encontrada',
      message: 'Tabela não encontrada',
    }),
    409: buildErrorResponse(409, 'TABLE_ALREADY_EXISTS', {
      description: 'Conflito - Já existe uma tabela com o slug gerado',
      message: 'Tabela já existe',
    }),
    500: buildErrorResponse(500, 'UPDATE_TABLE_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
