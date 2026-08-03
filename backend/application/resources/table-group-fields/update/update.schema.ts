import type { FastifySchema } from 'fastify';

export const GroupFieldUpdateSchema: FastifySchema = {
  tags: ['Campos de Grupo'],
  summary: 'Atualizar campo no grupo',
  description:
    'Atualiza um campo existente dentro de um FIELD_GROUP. Alterar o name muda apenas o título de exibição. Alterações no slug de campos de grupo estão atualmente bloqueadas para proteger os dados aninhados existentes.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['slug', 'groupSlug', 'fieldId'],
    properties: {
      slug: { type: 'string', description: 'Slug da tabela' },
      groupSlug: { type: 'string', description: 'Slug do grupo' },
      fieldId: { type: 'string', description: 'ID do campo a ser atualizado' },
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
      },
      slug: {
        type: 'string',
        minLength: 2,
        maxLength: 80,
        pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
        description:
          'Chave técnica segura do campo. A alteração de slugs de campos de grupo está atualmente bloqueada.',
      },
      type: { type: 'string' },
      required: { type: 'boolean', default: false },
      multiple: { type: 'boolean', default: false },
      showInFilter: { type: 'boolean', default: false },
      // Sem `default`: AJV preencheria a flag ausente com false e os dois
      // callers (form do campo / olho do Gerenciar) mandam PUT parcial, cada um
      // com so a flag que conhece — apagando a outra. Ausente = nao altera.
      showInParentList: { type: 'boolean' },
      visibleInParentList: { type: 'boolean' },
      widthInForm: { type: 'number', nullable: true, default: 50 },
      widthInList: { type: 'number', nullable: true, default: 10 },
      widthInDetail: { type: 'number', nullable: true, default: 50 },
      tip: { type: 'string', nullable: true, default: null },
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
      locked: { type: 'boolean', default: false },
      format: { type: 'string', nullable: true, default: null },
      defaultValue: {
        anyOf: [
          { type: 'string' },
          { type: 'array', items: { type: 'string' } },
          { type: 'null' },
        ],
        default: null,
      },
      dropdown: { type: 'array', nullable: true, default: [] },
      allowCustomDropdownOptions: { type: 'boolean', default: false },
      allowCreateRelationshipRecords: { type: 'boolean', default: false },
      fillWithCurrentUserWhenEmpty: { type: 'boolean', default: false },
      relationship: { type: 'object', nullable: true, default: null },
      category: { type: 'array', nullable: true, default: [] },
      group: {
        anyOf: [
          { type: 'string' },
          {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              slug: { type: 'string' },
            },
          },
          { type: 'null' },
        ],
        default: null,
        description: 'Grupo de destino do campo (slug ou objeto)',
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
      trashed: { type: 'boolean', default: false },
      trashedAt: { type: 'string', format: 'date-time', nullable: true },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Campo atualizado com sucesso',
      type: 'object',
      properties: {
        _id: { type: 'string' },
        name: { type: 'string' },
        slug: { type: 'string' },
        type: { type: 'string' },
        required: { type: 'boolean' },
        multiple: { type: 'boolean' },
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
        tip: { type: 'string', nullable: true },
        locked: { type: 'boolean' },
        native: { type: 'boolean' },
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
        format: { type: 'string', nullable: true },
        defaultValue: {
          anyOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } },
            { type: 'null' },
          ],
        },
        dropdown: {
          type: 'array',
          nullable: true,
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              color: { type: 'string' },
            },
          },
        },
        allowCustomDropdownOptions: { type: 'boolean' },
        allowCreateRelationshipRecords: { type: 'boolean' },
        fillWithCurrentUserWhenEmpty: { type: 'boolean' },
        relationship: {
          type: 'object',
          nullable: true,
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
          },
        },
        category: {
          type: 'array',
          nullable: true,
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
        trashed: { type: 'boolean' },
        trashedAt: { type: 'string', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    400: {
      description: 'Requisição inválida - parâmetros ou slug inválidos',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [400] },
        cause: {
          type: 'string',
          enum: [
            'INVALID_PAYLOAD_FORMAT',
            'INVALID_PARAMETERS',
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
      description: 'Não autorizado - autenticação necessária',
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
        'Proibido - permissão insuficiente ou campo nativo/bloqueado',
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
      description: 'Tabela, grupo ou campo não encontrado',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [404] },
        cause: {
          type: 'string',
          enum: ['TABLE_NOT_FOUND', 'GROUP_NOT_FOUND', 'FIELD_NOT_FOUND'],
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    409: {
      description: 'Conflito - campo ou opção de dropdown já existente',
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
        cause: { type: 'string', enum: ['UPDATE_GROUP_FIELD_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
