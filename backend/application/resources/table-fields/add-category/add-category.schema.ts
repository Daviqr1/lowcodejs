import type { FastifySchema } from 'fastify';

export const TableFieldAddCategorySchema: FastifySchema = {
  tags: ['Campos'],
  summary: 'Adicionar opção de categoria',
  description:
    'Adiciona uma nova opção de categoria a um campo do tipo CATEGORY, na raiz ou como filha de uma categoria existente.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['slug', '_id'],
    properties: {
      slug: {
        type: 'string',
        description: 'Slug da tabela que contém o campo',
      },
      _id: {
        type: 'string',
        description: 'ID do campo para adicionar a opção de categoria',
      },
    },
    additionalProperties: false,
  },
  body: {
    type: 'object',
    required: ['label'],
    properties: {
      label: {
        type: 'string',
        description: 'Rótulo da categoria',
      },
      parentId: {
        type: 'string',
        nullable: true,
        description: 'ID da categoria pai (null ou omitido para a raiz)',
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Opção de categoria criada com sucesso',
      type: 'object',
      properties: {
        node: {
          type: 'object',
          description: 'Nó de categoria criado',
          properties: {
            id: { type: 'string' },
            label: { type: 'string' },
            parentId: { type: 'string', nullable: true },
          },
        },
        field: {
          type: 'object',
          description: 'Campo atualizado',
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
            locked: { type: 'boolean' },
            native: { type: 'boolean' },
            defaultValue: {
              anyOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } },
                { type: 'null' },
              ],
            },
            relationship: { type: 'object', nullable: true },
            dropdown: { type: 'array', nullable: true },
            category: { type: 'array', nullable: true },
            group: { type: 'object', nullable: true },
          },
        },
      },
    },
    400: {
      description: 'Requisição inválida - Tipo de campo inválido',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [400] },
        cause: {
          type: 'string',
          enum: ['INVALID_FIELD_TYPE'],
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
      description: 'Não encontrado - Tabela, campo ou categoria pai não existe',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [404] },
        cause: {
          type: 'string',
          enum: [
            'TABLE_NOT_FOUND',
            'FIELD_NOT_FOUND',
            'PARENT_CATEGORY_NOT_FOUND',
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
        cause: { type: 'string', enum: ['ADD_CATEGORY_OPTION_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
