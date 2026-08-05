import type { FastifySchema } from 'fastify';

import { FIELD_TYPE_ALL_VALUES } from '@application/core/entity.core';
import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import { TableSlugParamsValidator } from '../_shared.validator';

export const TableSendToTrashSchema: FastifySchema = {
  tags: ['Tabelas'],
  summary: 'Enviar tabela para a lixeira',
  description:
    'Move uma tabela para a lixeira (soft delete). A tabela pode ser restaurada depois ou excluída permanentemente.',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(TableSlugParamsValidator),
  response: {
    200: {
      description:
        'Tabela enviada para a lixeira com sucesso, com dados populados',
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
            _id: { type: 'string', description: 'ID do armazenamento' },
            url: { type: 'string', description: 'URL do arquivo' },
            filename: {
              type: 'string',
              description: 'Nome original do arquivo',
            },
          },
        },
        fields: {
          type: 'array',
          description: 'Campos da tabela (populados)',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string', description: 'ID do campo' },
              name: { type: 'string', description: 'Nome do campo' },
              slug: { type: 'string', description: 'Slug do campo' },
              type: {
                type: 'string',
                enum: FIELD_TYPE_ALL_VALUES,
                description: 'Tipo do campo do enum FIELD_TYPE',
              },
              required: {
                type: 'boolean',
                description: 'Campo é obrigatório',
              },
              multiple: {
                type: 'boolean',
                description: 'Permite múltiplos valores',
              },
              format: {
                type: 'string',
                nullable: true,
                enum: ['email', 'phone', 'url', 'color', 'password'],
                description: 'Validação de formato do campo',
              },
              showInFilter: {
                type: 'boolean',
                description: 'Permitir filtragem',
              },
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
              tip: {
                type: 'string',
                nullable: true,
                description:
                  'Texto de ajuda opcional exibido nos formulários de registro',
              },
              locked: {
                type: 'boolean',
                description: 'Campo está bloqueado e não pode ser modificado',
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
                additionalProperties: true,
                description:
                  'Configuração de relacionamento para campos RELATIONSHIP',
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
              dropdown: {
                type: 'array',
                description: 'Opções de seleção para campos DROPDOWN',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    label: { type: 'string' },
                  },
                },
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
                description: 'Árvore de categorias para campos CATEGORY',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    label: { type: 'string' },
                    children: { type: 'array', items: {} },
                  },
                },
              },
              group: {
                type: 'object',
                nullable: true,
                description: 'Configuração de grupo de campos',
                properties: {
                  _id: { type: 'string', nullable: true },
                  slug: { type: 'string', nullable: true },
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
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        style: {
          type: 'string',
          enum: ['GALLERY', 'LIST', 'DOCUMENT', 'CARD', 'MOSAIC', 'KANBAN'],
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
        fieldOrderList: {
          type: 'array',
          items: { type: 'string' },
          description: 'Ordem dos campos na visualização de lista',
        },
        fieldOrderForm: {
          type: 'array',
          items: { type: 'string' },
          description: 'Ordem dos campos na visualização de formulário',
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
            'Schema MongoDB gerado a partir dos campos, com as propriedades trashedAt e trashed',
          additionalProperties: true,
        },
        trashed: {
          type: 'boolean',
          enum: [true],
          description: 'Tabela agora está na lixeira',
        },
        trashedAt: {
          type: 'string',
          format: 'date-time',
          description: 'Data e hora do envio para a lixeira',
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          description: 'Data e hora de criação',
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          description: 'Data e hora da última atualização',
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
    409: buildErrorResponse(409, 'ALREADY_TRASHED', {
      description: 'Conflito - A tabela já está na lixeira',
      message: 'Tabela já está na lixeira',
    }),
    500: buildErrorResponse(500, 'SEND_TABLE_TO_TRASH_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
