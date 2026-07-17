import type { FastifySchema } from 'fastify';

export const TablePaginatedSchema: FastifySchema = {
  tags: ['Tabelas'],
  summary: 'Listar tabelas com paginação',
  description:
    'Retorna uma lista paginada de tabelas com busca, filtros e ordenação opcionais. Apenas tabelas do tipo TABLE são retornadas.',
  security: [{ cookieAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      page: {
        type: 'number',
        minimum: 1,
        default: 1,
        description: 'Número da página (começa em 1)',
        examples: [1, 2, 5],
      },
      perPage: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        default: 50,
        description: 'Quantidade de itens por página (máx. 100)',
        examples: [10, 25, 50, 100],
      },
      search: {
        type: 'string',
        minLength: 1,
        description:
          'Termo de busca para filtrar tabelas por nome ou slug (opcional)',
        examples: ['user', 'product', 'blog'],
      },
      'order-name': {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Ordenar por nome (opcional)',
        examples: ['asc', 'desc'],
      },
      'order-link': {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Ordenar por link (opcional)',
        examples: ['asc', 'desc'],
      },
      'order-created-at': {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Ordenar por data de criação (opcional)',
        examples: ['asc', 'desc'],
      },
      'order-owner': {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Ordenar por nome do proprietário (opcional)',
        examples: ['asc', 'desc'],
      },
      trashed: {
        type: 'string',
        enum: ['true', 'false'],
        default: 'false',
        description: 'Incluir itens na lixeira (opcional)',
        examples: ['true', 'false'],
      },
      name: {
        type: 'string',
        description: 'Filtrar por nome exato da tabela (opcional)',
        examples: ['Users', 'Products'],
      },
      owner: {
        type: 'string',
        description: 'Filtrar por nome do proprietário (opcional)',
        examples: ['John'],
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Lista paginada de tabelas',
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string', description: 'ID da tabela' },
              name: { type: 'string', description: 'Nome da tabela' },
              description: {
                type: 'string',
                nullable: true,
                description: 'Descrição da tabela',
              },
              slug: {
                type: 'string',
                description: 'Slug de URL da tabela',
              },
              logo: {
                type: 'object',
                nullable: true,
                description:
                  'Detalhes de armazenamento do logo da tabela (populado)',
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
                    type: {
                      type: 'string',
                      enum: [
                        'TEXT_SHORT',
                        'TEXT_LONG',
                        'DROPDOWN',
                        'DATE',
                        'RELATIONSHIP',
                        'FILE',
                        'FIELD_GROUP',
                        'REACTION',
                        'EVALUATION',
                        'CATEGORY',
                        'USER',
                        'HTML_CONTENT',
                        'CREATOR',
                        'IDENTIFIER',
                        'CREATED_AT',
                        'UPDATED_AT',
                        'UPDATER',
                        'STATUS',
                        'TRASHED_AT',
                      ],
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
                      description:
                        'O campo está bloqueado e não pode ser modificado',
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
                      description: 'Configuração de relacionamento',
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
                            items: {
                              type: 'object',
                              additionalProperties: true,
                            },
                          },
                          allowCustomDropdownOptions: { type: 'boolean' },
                          allowCreateRelationshipRecords: { type: 'boolean' },
                          fillWithCurrentUserWhenEmpty: { type: 'boolean' },
                          category: {
                            type: 'array',
                            nullable: true,
                            items: {
                              type: 'object',
                              additionalProperties: true,
                            },
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
                description: 'Schema MongoDB gerado a partir dos campos',
                additionalProperties: true,
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
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: {
              type: 'number',
              description: 'Total de tabelas',
            },
            perPage: {
              type: 'number',
              description: 'Quantidade de itens por página',
            },
            page: { type: 'number', description: 'Número da página atual' },
            lastPage: {
              type: 'number',
              description: 'Número da última página',
            },
            firstPage: {
              type: 'number',
              description: 'Número da primeira página',
            },
          },
        },
      },
    },
    401: {
      description: 'Não autenticado - Autenticação necessária',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [401] },
        cause: { type: 'string', enum: ['AUTHENTICATION_REQUIRED'] },
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
        cause: {
          type: 'string',
          enum: ['TABLE_LIST_PAGINATED_ERROR'],
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
