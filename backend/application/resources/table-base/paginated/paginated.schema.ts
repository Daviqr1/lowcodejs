import type { FastifySchema } from 'fastify';

export const TablePaginatedSchema: FastifySchema = {
  tags: ['Tables'],
  summary: 'List tables paginated',
  description:
    'Get a paginated list of Tables with optional search and filtering',
  security: [{ cookieAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      page: {
        type: 'number',
        minimum: 1,
        default: 1,
        description: 'Page number (starts from 1)',
        examples: [1, 2, 5],
      },
      perPage: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        default: 50,
        description: 'Number of items per page (max 100)',
        examples: [10, 25, 50, 100],
      },
      search: {
        type: 'string',
        minLength: 1,
        description:
          'Search term for filtering Tables by name or slug (optional)',
        examples: ['user', 'product', 'blog'],
      },
      _ids: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Filter by specific table IDs. Used by TableMultiSelect to hydrate selected tables not on the first page.',
      },
      'order-name': {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Order by name (optional)',
        examples: ['asc', 'desc'],
      },
      'order-link': {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Order by link (optional)',
        examples: ['asc', 'desc'],
      },
      'order-created-at': {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Order by created at (optional)',
        examples: ['asc', 'desc'],
      },
      'order-visibility': {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Order by visibility (optional)',
        examples: ['asc', 'desc'],
      },
      'order-owner': {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Order by owner name (optional)',
        examples: ['asc', 'desc'],
      },
      trashed: {
        type: 'string',
        enum: ['true', 'false'],
        default: 'false',
        description: 'Include trashed items (optional)',
        examples: ['true', 'false'],
      },
      public: {
        type: 'string',
        enum: ['true', 'false'],
        default: 'false',
        description: 'Filter by public visibility (optional)',
        examples: ['true', 'false'],
      },
      type: {
        type: 'string',
        enum: ['TABLE', 'FIELD_GROUP'],
        description: 'Filter by table type (optional)',
        examples: ['TABLE', 'FIELD_GROUP'],
      },
      name: {
        type: 'string',
        description: 'Filter by exact table name (optional)',
        examples: ['Users', 'Products'],
      },
      visibility: {
        type: 'string',
        description: 'Filter by visibility (optional)',
        examples: ['PUBLIC', 'PRIVATE', 'RESTRICTED', 'OPEN', 'FORM'],
      },
      owner: {
        type: 'string',
        description: 'Filter by owner name (optional)',
        examples: ['John'],
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Paginated list of Tables',
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string', description: 'Table ID' },
              name: { type: 'string', description: 'Table name' },
              description: {
                type: 'string',
                nullable: true,
                description: 'Table description',
              },
              slug: {
                type: 'string',
                description: 'Table URL slug',
              },
              logo: {
                type: 'object',
                nullable: true,
                description: 'Table logo storage details (populated)',
                properties: {
                  _id: { type: 'string', description: 'Storage ID' },
                  url: { type: 'string', description: 'File URL' },
                  filename: {
                    type: 'string',
                    description: 'Original filename',
                  },
                  type: { type: 'string', description: 'MIME type' },
                },
              },
              fields: {
                type: 'array',
                description: 'Table fields',
                items: {
                  type: 'object',
                  properties: {
                    _id: { type: 'string', description: 'Field ID' },
                    name: { type: 'string', description: 'Field name' },
                    slug: { type: 'string', description: 'Field slug' },
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
                      ],
                      description: 'Field type',
                    },
                    required: {
                      type: 'boolean',
                      description: 'Is field required',
                    },
                    multiple: {
                      type: 'boolean',
                      description: 'Allows multiple values',
                    },
                    format: {
                      type: 'string',
                      nullable: true,
                      description: 'Field format validation',
                    },
                    showInList: {
                      type: 'boolean',
                      description: 'Show in listings',
                    },
                    showInForm: {
                      type: 'boolean',
                      description: 'Show in form view',
                    },
                    showInDetail: {
                      type: 'boolean',
                      description: 'Show in detail view',
                    },
                    showInFilter: {
                      type: 'boolean',
                      description: 'Allow filtering',
                    },
                    widthInForm: {
                      type: 'number',
                      nullable: true,
                      description: 'Field width in forms, integer 0-100 (%)',
                    },
                    widthInList: {
                      type: 'number',
                      nullable: true,
                      description:
                        'Field width in list/grid views, integer 0-100 (px)',
                    },
                    widthInDetail: {
                      type: 'number',
                      nullable: true,
                      description:
                        'Field width in detail views, integer 0-100 (%)',
                    },
                    locked: {
                      type: 'boolean',
                      description: 'Field is locked and cannot be modified',
                    },
                    native: {
                      type: 'boolean',
                      description: 'Field is native',
                    },
                    defaultValue: {
                      anyOf: [
                        { type: 'string' },
                        { type: 'array', items: { type: 'string' } },
                        { type: 'null' },
                      ],
                      description: 'Default field value',
                    },
                    relationship: {
                      type: 'object',
                      nullable: true,
                      description: 'Relationship configuration',
                    },
                    dropdown: {
                      type: 'array',
                      nullable: true,
                      description: 'Dropdown options',
                    },
                    allowCustomDropdownOptions: {
                      type: 'boolean',
                      description:
                        'Allow users to create new dropdown options from row input',
                    },
                    category: {
                      type: 'array',
                      nullable: true,
                      description: 'Category options',
                    },
                    group: {
                      type: 'object',
                      nullable: true,
                      description: 'Field group configuration',
                    },
                    trashed: {
                      type: 'boolean',
                      description: 'Is field in trash',
                    },
                    trashedAt: {
                      type: 'string',
                      format: 'date-time',
                      nullable: true,
                      description: 'When field was trashed',
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
                description: 'Display style',
              },
              visibility: {
                type: 'string',
                enum: ['PUBLIC', 'RESTRICTED', 'OPEN', 'FORM', 'PRIVATE'],
                description: 'Visibility setting',
              },
              collaboration: {
                type: 'string',
                enum: ['OPEN', 'RESTRICTED'],
                description: 'Collaboration setting',
              },
              administrators: {
                type: 'array',
                description: 'Administrator users (populated)',
                items: {
                  type: 'object',
                  properties: {
                    _id: { type: 'string', description: 'User ID' },
                    name: {
                      type: 'string',
                      description: 'User name',
                    },
                  },
                },
              },
              owner: {
                type: 'object',
                description: 'Table owner (populated)',
                properties: {
                  _id: { type: 'string', description: 'User ID' },
                  name: { type: 'string', description: 'User name' },
                },
              },
              fieldOrderList: {
                type: 'array',
                items: { type: 'string' },
                description: 'Field order for list view',
              },
              fieldOrderForm: {
                type: 'array',
                items: { type: 'string' },
                description: 'Field order for form view',
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
                description: 'Table type',
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
                        description: 'Code to execute before saving',
                      },
                    },
                  },
                  afterSave: {
                    type: 'object',
                    properties: {
                      code: {
                        type: 'string',
                        nullable: true,
                        description: 'Code to execute after saving',
                      },
                    },
                  },
                  onLoad: {
                    type: 'object',
                    properties: {
                      code: {
                        type: 'string',
                        nullable: true,
                        description: 'Code to execute before saving',
                      },
                    },
                  },
                },
                description: 'Table methods configuration',
              },
              groups: {
                type: 'array',
                description: 'Field groups configuration',
                items: {
                  type: 'object',
                  properties: {
                    slug: { type: 'string', description: 'Group slug' },
                    name: { type: 'string', description: 'Group name' },
                    fields: {
                      type: 'array',
                      description: 'Fields within the group',
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
                          showInList: { type: 'boolean' },
                          showInForm: { type: 'boolean' },
                          showInDetail: { type: 'boolean' },
                          showInFilter: { type: 'boolean' },
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
                          allowCustomDropdownOptions: { type: 'boolean' },
                          category: { type: 'array', nullable: true },
                          group: { type: 'object', nullable: true },
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
                      description: 'Group schema',
                      additionalProperties: true,
                    },
                  },
                },
              },
              order: {
                type: 'object',
                description: 'Default sort order for table records',
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
                description: 'Generated MongoDB schema based on fields',
                additionalProperties: true,
              },
              trashed: {
                type: 'boolean',
                description: 'Is table in trash',
              },
              trashedAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                description: 'When table was trashed',
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
              description: 'Total number of Tables',
            },
            perPage: {
              type: 'number',
              description: 'Number of items per page',
            },
            page: { type: 'number', description: 'Current page number' },
            lastPage: { type: 'number', description: 'Last page number' },
            firstPage: {
              type: 'number',
              description: 'First page number',
            },
          },
        },
      },
    },
    401: {
      description: 'Unauthorized - Authentication required',
      type: 'object',
      properties: {
        message: { type: 'string', enum: ['Unauthorized'] },
        code: { type: 'number', enum: [401] },
        cause: { type: 'string', enum: ['AUTHENTICATION_REQUIRED'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
      examples: [
        {
          message: 'Unauthorized',
          code: 401,
          cause: 'AUTHENTICATION_REQUIRED',
        },
      ],
    },
    500: {
      description: 'Internal server error - Database or server issues',
      type: 'object',
      properties: {
        message: { type: 'string', enum: ['Internal server error'] },
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
