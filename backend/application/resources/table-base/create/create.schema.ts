import type { FastifySchema } from 'fastify';

export const TableCreateSchema: FastifySchema = {
  tags: ['Tabelas'],
  summary: 'Criar uma nova tabela',
  description:
    'Cria uma nova tabela com campos, configuração e definições de permissões',
  security: [{ cookieAuth: [] }],
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: {
        type: 'string',
        description: 'Nome da tabela',
      },
      slug: {
        type: 'string',
        description:
          'Slug da tabela (opcional; gerado a partir do nome quando ausente)',
      },
      logo: {
        type: 'string',
        nullable: true,
        description: 'ID de armazenamento do logo da tabela',
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
        default: 'LIST',
        description: 'Estilo de exibição da tabela',
      },
    },
    additionalProperties: false,
  },
  response: {
    201: {
      description: 'Tabela criada com sucesso',
      type: 'object',
      properties: {
        _id: { type: 'string', description: 'ID da tabela' },
        name: { type: 'string', description: 'Nome da tabela' },
        description: {
          type: 'string',
          nullable: true,
          description: 'Descrição da tabela',
        },
        slug: { type: 'string', description: 'Slug da tabela' },
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
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string', description: 'ID do campo' },
              name: { type: 'string', description: 'Nome do campo' },
              slug: {
                type: 'string',
                description: 'Slug do campo (gerado a partir do nome)',
              },
              label: {
                type: 'string',
                nullable: true,
                description: 'Rótulo customizado de exibição do campo',
              },
              type: {
                type: 'string',
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
          description: 'Campos da tabela (processados com slugs)',
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
          description: 'Estilo de exibição da tabela',
        },
        owner: {
          type: 'object',
          description: 'Proprietário da tabela (populado)',
          properties: {
            _id: { type: 'string', description: 'ID do usuário' },
            name: { type: 'string', description: 'Nome do usuário' },
          },
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
          default: [],
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
    400: {
      description: 'Requisição inválida - Proprietário obrigatório',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [400] },
        cause: {
          type: 'string',
          enum: ['OWNER_REQUIRED'],
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
      examples: [
        {
          message: 'Proprietário é obrigatório',
          code: 400,
          cause: 'OWNER_REQUIRED',
        },
      ],
    },
    401: {
      description: 'Não autenticado - Autenticação necessária',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [401] },
        cause: {
          type: 'string',
          enum: ['AUTHENTICATION_REQUIRED', 'USER_NOT_AUTHENTICATED'],
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    403: {
      description: 'Acesso negado - Permissão insuficiente',
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
          ],
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    409: {
      description: 'Conflito - Já existe uma tabela com este nome',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [409] },
        cause: { type: 'string', enum: ['TABLE_ALREADY_EXISTS'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
      examples: [
        {
          message: 'Tabela já existe',
          code: 409,
          cause: 'TABLE_ALREADY_EXISTS',
        },
      ],
    },
    500: {
      description:
        'Erro interno do servidor - Problemas de banco de dados ou servidor',
      type: 'object',
      properties: {
        message: { type: 'string', enum: ['Erro interno do servidor'] },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['CREATE_TABLE_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
