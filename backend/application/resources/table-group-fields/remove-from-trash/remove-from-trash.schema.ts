import type { FastifySchema } from 'fastify';

export const GroupFieldRemoveFromTrashSchema: FastifySchema = {
  tags: ['Campos de Grupo'],
  summary: 'Restaurar campo de grupo da lixeira',
  description:
    'Restaura um campo dentro de um FIELD_GROUP da lixeira. Define trashed=false e reabilita as propriedades de exibição.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['slug', 'groupSlug', 'fieldId'],
    properties: {
      slug: { type: 'string', description: 'Slug da tabela' },
      groupSlug: { type: 'string', description: 'Slug do grupo' },
      fieldId: { type: 'string', description: 'ID do campo a restaurar' },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Campo restaurado da lixeira com sucesso',
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
        trashed: { type: 'boolean' },
        trashedAt: { type: 'string', format: 'date-time', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    400: {
      description: 'Requisição inválida - parâmetros inválidos',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [400] },
        cause: {
          type: 'string',
          enum: ['INVALID_PAYLOAD_FORMAT', 'INVALID_PARAMETERS'],
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
      description: 'Proibido - permissão insuficiente',
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
      description: 'Campo não está na lixeira',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [409] },
        cause: { type: 'string', enum: ['NOT_TRASHED'] },
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
          enum: ['REMOVE_GROUP_FIELD_FROM_TRASH_ERROR'],
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
