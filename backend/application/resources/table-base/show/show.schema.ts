import type { FastifySchema } from 'fastify';

import { FIELD_TYPE_ALL_VALUES } from '@application/core/entity.core';

export const TableShowSchema: FastifySchema = {
  tags: ['Tabelas'],
  summary: 'Buscar tabela por slug',
  description:
    'Retorna uma tabela pelo slug com campos e administradores populados. Autenticação opcional: tabelas públicas podem ser acessadas por visitantes.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['slug'],
    properties: {
      slug: {
        type: 'string',
        description: 'Identificador slug da tabela',
        examples: ['users', 'products', 'blog-posts'],
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Tabela retornada com sucesso com dados populados',
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
          },
        },
        fields: {
          type: 'array',
          description: 'Campos da tabela (populado)',
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
                description: 'Se o campo é obrigatório',
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
              permissions: {
                type: 'object',
                nullable: true,
                description:
                  'Visibilidade do campo por contexto (lista/formulário/detalhe)',
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
              slug: {
                type: 'string',
                description: 'Identificador slug do grupo',
              },
              name: {
                type: 'string',
                description: 'Nome de exibição do grupo',
              },
              fields: {
                type: 'array',
                description: 'Campos dentro do grupo (populado)',
                items: {
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
                    validations: {
                      type: 'array',
                      items: { type: 'object', additionalProperties: true },
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
                description: 'Schema MongoDB gerado para o grupo',
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
    401: {
      description: 'Não autenticado - Autenticação necessária',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [401] },
        cause: { type: 'string', enum: ['USER_NOT_AUTHENTICATED'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    403: {
      description:
        'Acesso negado - Visibilidade ou permissão restringe o acesso',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [403] },
        cause: {
          type: 'string',
          enum: [
            'USER_NOT_FOUND',
            'USER_NOT_ACTIVE',
            'PERMISSIONS_NOT_FOUND',
            'INSUFFICIENT_PERMISSIONS',
            'TABLE_PRIVATE',
            'FORM_VIEW_RESTRICTED',
          ],
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    404: {
      description: 'Tabela não encontrada',
      type: 'object',
      properties: {
        message: { type: 'string', enum: ['Tabela não encontrada'] },
        code: { type: 'number', enum: [404] },
        cause: { type: 'string', enum: ['TABLE_NOT_FOUND'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    500: {
      description: 'Erro interno do servidor',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['GET_TABLE_BY_SLUG_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
