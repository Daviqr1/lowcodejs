import type { FastifySchema } from 'fastify';

export const TableFieldUpdateSchema: FastifySchema = {
  tags: ['Campos'],
  summary: 'Atualizar campo',
  description:
    'Atualiza um campo existente em uma tabela. Em campos não-nativos o `slug` (chave técnica/url) é editável e, ao mudar, renomeia os dados armazenados. Campos nativos têm slug fixo e só aceitam o `label`.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['slug', '_id'],
    properties: {
      slug: {
        type: 'string',
        description: 'Slug da tabela que contém o campo',
        examples: ['users', 'products', 'blog-posts'],
      },
      _id: {
        type: 'string',
        description: 'ID do campo a ser atualizado',
        examples: ['507f1f77bcf86cd799439011'],
      },
    },
    additionalProperties: false,
  },
  body: {
    type: 'object',
    required: ['name', 'type'],
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 500,
        description: 'Título de exibição do campo mostrado aos usuários finais',
        examples: [
          'Full Name Updated',
          'Pesquise na base do USPTO e digite os resultados encontrados na busca de anterioridade (padrão). Você tem condições?',
        ],
      },
      slug: {
        type: 'string',
        minLength: 2,
        maxLength: 80,
        pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
        description:
          'Chave técnica/url do campo (apenas não-nativos). Alterá-la renomeia os dados armazenados. Omitir em campos nativos.',
        examples: ['full-name', 'nome-slug-campo'],
      },
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
        description: 'Tipo do campo (do enum FIELD_TYPE)',
      },
      required: {
        type: 'boolean',
        default: false,
        description: 'Campo é obrigatório no preenchimento',
      },
      multiple: {
        type: 'boolean',
        default: false,
        description: 'Campo aceita múltiplos valores',
      },
      showInFilter: {
        type: 'boolean',
        default: false,
        description: 'Permitir filtrar por este campo',
      },
      // Sem `default`: AJV preencheria a flag ausente com false e apagaria a
      // outra num PUT parcial (ver table-group-fields/update/update.schema.ts).
      showInParentList: {
        type: 'boolean',
        description:
          'Campo-filho de grupo: elegivel a aparecer na listagem geral da tabela pai',
      },
      visibleInParentList: {
        type: 'boolean',
        description:
          'Campo-filho de grupo: coluna visivel na listagem geral da tabela pai',
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
      widthInForm: {
        type: 'number',
        nullable: true,
        default: 50,
        description: 'Largura do campo nos formulários, inteiro 0-100 (%)',
      },
      widthInList: {
        type: 'number',
        nullable: true,
        default: 10,
        description:
          'Largura do campo nas visualizações de lista/grade, inteiro 0-100 (px)',
      },
      widthInDetail: {
        type: 'number',
        nullable: true,
        default: 50,
        description:
          'Largura do campo nas visualizações de detalhe, inteiro 0-100 (%)',
      },
      tip: {
        type: 'string',
        nullable: true,
        default: null,
        description: 'Texto de ajuda opcional exibido nos formulários',
      },
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
      locked: {
        type: 'boolean',
        default: false,
        description: 'Campo está bloqueado e não pode ser modificado',
      },
      format: {
        type: 'string',
        nullable: true,
        default: null,
        description: 'Formato do campo',
      },
      defaultValue: {
        anyOf: [
          { type: 'string' },
          { type: 'array', items: { type: 'string' } },
          { type: 'null' },
        ],
        default: null,
        description: 'Valor padrão do campo',
      },
      dropdown: {
        type: 'array',
        nullable: true,
        default: [],
        description: 'Opções para o tipo DROPDOWN',
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
        default: false,
        description:
          'Permitir que usuários criem novas opções de seleção a partir do formulário',
      },
      allowCreateRelationshipRecords: {
        type: 'boolean',
        default: false,
        description:
          'Permitir que usuários criem registros na tabela relacionada a partir do formulário',
      },
      fillWithCurrentUserWhenEmpty: {
        type: 'boolean',
        default: false,
        description:
          'Campo USER: grava o usuário logado quando nenhum id de usuário é enviado no payload',
      },
      relationship: {
        type: 'object',
        nullable: true,
        default: null,
        description: 'Configuração para o tipo RELATIONSHIP',
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
          customLabel: {
            type: 'boolean',
            default: false,
            description:
              'Habilitar rótulo composto/personalizado para as opções de seleção',
          },
          labelParts: {
            type: 'array',
            description:
              'Caminhos (dot-paths) ordenados que compõem o rótulo personalizado',
            items: {
              type: 'object',
              required: ['path'],
              properties: {
                path: { type: 'string' },
                label: { type: 'string' },
              },
            },
          },
          labelSeparator: {
            type: 'string',
            default: ' - ',
            description: 'Separador entre as partes do rótulo',
          },
          visible: {
            type: 'boolean',
            default: true,
            description: 'Mostra a tabela interna deste lado (source)',
          },
          onDelete: {
            type: 'string',
            enum: ['CASCADE', 'SET_NULL', 'RESTRICT'],
            description:
              'Política ao excluir o registro alvo: CASCADE remove os que apontavam, SET_NULL limpa o vínculo, RESTRICT bloqueia enquanto houver vínculo',
          },
          mirror: {
            type: 'object',
            description:
              'Configuração do lado espelho. Reenvie-o completo no update: o backend sobrescreve o objeto relationship inteiro. Se label for omitido, usa o nome da tabela source',
            properties: {
              multiple: {
                type: 'boolean',
                default: false,
                description: 'O espelho aceita múltiplos vínculos',
              },
              visible: {
                type: 'boolean',
                default: false,
                description: 'Mostra a tabela interna no lado espelho',
              },
              label: {
                type: 'string',
                description: 'Rótulo do campo espelho na tabela alvo',
              },
            },
          },
          formMode: {
            type: 'string',
            enum: ['select', 'manage'],
            default: 'select',
            description:
              'UX no formulário: select (multi-select) ou manage (tabela interna embutida). Derivado: manage só quando ambos os lados são múltiplos (N:N)',
          },
          max: {
            type: 'number',
            nullable: true,
            default: null,
            description:
              'Limite de vínculos deste lado (null = ilimitado, só para multiple)',
          },
        },
      },
      group: {
        anyOf: [
          { type: 'null' },
          { type: 'string', description: 'Slug do grupo' },
          {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              slug: { type: 'string' },
            },
          },
        ],
        default: null,
        description: 'Configuração para o tipo FIELD_GROUP (slug ou objeto)',
      },
      category: {
        type: 'array',
        nullable: true,
        default: [],
        description: 'Categorias para o tipo CATEGORY',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            label: { type: 'string' },
            children: { type: 'array' },
          },
        },
      },
      validations: {
        type: 'array',
        default: [],
        description: 'Regras de validação configuradas para o campo',
        items: {
          type: 'object',
          properties: {
            rule: { type: 'string' },
            config: { type: 'object', additionalProperties: true },
          },
        },
      },
      trashed: {
        type: 'boolean',
        description: 'Definir o campo como enviado para a lixeira',
        examples: [true, false],
      },
      trashedAt: {
        type: 'string',
        format: 'date-time',
        nullable: true,
        description: 'Data/hora em que o campo foi enviado para a lixeira',
        examples: ['2023-01-01T00:00:00.000Z', null],
      },
      htmlContent: { type: 'string', nullable: true, default: null },
    },
    additionalProperties: false,
  },
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
    400: {
      description:
        'Requisição inválida - Falha na validação do payload ou slug/tabela inválidos',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [400] },
        cause: {
          type: 'string',
          enum: [
            'INVALID_PAYLOAD_FORMAT',
            'INVALID_TABLE_SLUG',
            'INVALID_FIELD_SLUG',
          ],
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    401: {
      description: 'Não autorizado - Autenticação necessária',
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
      description:
        'Acesso negado - Permissões insuficientes ou campo protegido',
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
            'OWNER_OR_ADMIN_REQUIRED',
            'NATIVE_FIELD_CANNOT_BE_TRASHED',
            'FIELD_LOCKED',
          ],
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    404: {
      description: 'Tabela ou campo não encontrado',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [404] },
        cause: {
          type: 'string',
          enum: ['TABLE_NOT_FOUND', 'FIELD_NOT_FOUND'],
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    409: {
      description:
        'Conflito - Último campo ativo, campo já existe ou opções de dropdown duplicadas',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [409] },
        cause: {
          type: 'string',
          enum: [
            'LAST_ACTIVE_FIELD',
            'FIELD_ALREADY_EXIST',
            'DROPDOWN_OPTION_ALREADY_EXISTS',
          ],
        },
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
          enum: ['UPDATE_FIELD_TABLE_ERROR'],
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
