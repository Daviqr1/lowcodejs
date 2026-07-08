import type { FastifySchema } from 'fastify';

export const TableFieldCreateSchema: FastifySchema = {
  tags: ['Campos'],
  summary: 'Criar campo',
  description:
    'Cria um novo campo em uma tabela. O título de exibição é armazenado em name, enquanto slug é a chave técnica segura. Se slug for omitido, a API o gera a partir de name. Para o tipo FIELD_GROUP, cria um novo grupo de campos.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['slug'],
    properties: {
      slug: {
        type: 'string',
        description: 'Slug da tabela onde o campo será criado',
        examples: ['users', 'products', 'blog-posts'],
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
          'Full Name',
          'Pesquise na base do USPTO e digite os resultados encontrados na busca de anterioridade (padrão). Você tem condições?',
        ],
      },
      slug: {
        type: 'string',
        minLength: 2,
        maxLength: 80,
        pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
        description:
          'Chave técnica segura do campo. Use apenas letras minúsculas, números e hífens. Se omitido, a API sugere uma a partir de name.',
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
        ],
        description: 'Tipo do campo, conforme o enum FIELD_TYPE',
      },
      required: {
        type: 'boolean',
        default: false,
        description: 'Campo é obrigatório no preenchimento',
      },
      multiple: {
        type: 'boolean',
        default: false,
        description: 'Campo permite múltiplos valores',
      },
      showInFilter: {
        type: 'boolean',
        default: false,
        description: 'Permitir filtrar por este campo',
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
        description: 'Largura do campo em formulários, inteiro 0-100 (%)',
      },
      widthInList: {
        type: 'number',
        nullable: true,
        default: 10,
        description:
          'Largura do campo em visualizações de lista/grade, inteiro 0-100 (px)',
      },
      widthInDetail: {
        type: 'number',
        nullable: true,
        default: 50,
        description:
          'Largura do campo em visualizações de detalhe, inteiro 0-100 (%)',
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
        description:
          'Formato do campo (para TEXT_SHORT: ALPHA_NUMERIC, INTEGER, DECIMAL, URL, EMAIL; para DATE: diversos formatos de data)',
        examples: ['EMAIL', 'dd/MM/yyyy', 'DECIMAL'],
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
        description: 'Opções para campos do tipo DROPDOWN',
        items: {
          type: 'object',
          required: ['id', 'label'],
          properties: {
            id: { type: 'string', description: 'ID da opção de seleção' },
            label: {
              type: 'string',
              description: 'Rótulo da opção de seleção',
            },
            color: { type: 'string', description: 'Cor da opção de seleção' },
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
            required: ['_id', 'slug'],
            properties: {
              _id: {
                type: 'string',
                description: 'ID da tabela de destino',
              },
              slug: {
                type: 'string',
                description: 'Slug da tabela de destino',
              },
            },
          },
          field: {
            type: 'object',
            required: ['_id', 'slug'],
            properties: {
              _id: { type: 'string', description: 'ID do campo de destino' },
              slug: {
                type: 'string',
                description: 'Slug do campo de destino',
              },
            },
          },
          order: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'asc',
            description: 'Ordem de classificação dos dados do relacionamento',
          },
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
              'Configuração do lado espelho (campo materializado na tabela alvo). Se label for omitido, o backend usa o nome da tabela source',
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
              _id: {
                type: 'string',
                description: 'ID da tabela do grupo de campos',
              },
              slug: {
                type: 'string',
                description: 'Slug da tabela do grupo de campos',
              },
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
          required: ['id', 'label'],
          properties: {
            id: { type: 'string', description: 'ID da categoria' },
            label: { type: 'string', description: 'Rótulo da categoria' },
            children: {
              type: 'array',
              description: 'Categorias aninhadas',
            },
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
      htmlContent: {
        type: 'string',
        nullable: true,
        default: null,
        description: 'Conteúdo HTML para campos do tipo HTML_CONTENT',
      },
    },
    additionalProperties: false,
  },
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
      description: 'Acesso negado - Permissões insuficientes',
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
        message: { type: 'string' },
        code: { type: 'number', enum: [404] },
        cause: { type: 'string', enum: ['TABLE_NOT_FOUND'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    409: {
      description:
        'Conflito - Campo já existe ou opções de dropdown duplicadas',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [409] },
        cause: {
          type: 'string',
          enum: ['FIELD_ALREADY_EXIST', 'DROPDOWN_OPTION_ALREADY_EXISTS'],
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
        cause: { type: 'string', enum: ['CREATE_FIELD_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
