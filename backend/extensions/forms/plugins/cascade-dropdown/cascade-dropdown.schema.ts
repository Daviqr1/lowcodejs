const ErrorResponse = {
  type: 'object',
  properties: {
    message: { type: 'string' },
    code: { type: ['string', 'number'] },
    cause: { type: 'string' },
    errors: { type: 'object', additionalProperties: { type: 'string' } },
  },
};

const filterSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    fieldId: { type: 'string' },
    fieldSlug: { type: 'string' },
    fieldType: { type: 'string' },
    operator: {
      type: 'string',
      enum: [
        'equals',
        'not_equals',
        'contains',
        'is_empty',
        'is_not_empty',
        'date_between',
      ],
    },
    value: { type: 'string', nullable: true },
    values: { type: 'array', items: { type: 'string' } },
    dateStart: { type: 'string', nullable: true },
    dateEnd: { type: 'string', nullable: true },
  },
};

const configResponseSchema = {
  type: 'object',
  nullable: true,
  description: 'Configuração do dropdown em cascata para o campo',
  properties: {
    _id: { type: 'string' },
    targetTableSlug: { type: 'string' },
    targetFieldId: { type: 'string' },
    targetFieldSlug: { type: 'string' },
    sourceTableId: { type: 'string' },
    sourceTableSlug: { type: 'string' },
    parentFieldId: { type: 'string' },
    parentFieldSlug: { type: 'string' },
    childFieldId: { type: 'string' },
    childFieldSlug: { type: 'string' },
    enabled: { type: 'boolean' },
    parentWidth: { type: 'number' },
    childWidth: { type: 'number' },
    filters: { type: 'array', items: filterSchema },
  },
};

const configParams = {
  type: 'object',
  required: ['slug', 'fieldId'],
  properties: {
    slug: { type: 'string', description: 'Slug da tabela' },
    fieldId: { type: 'string', description: 'ID do campo de relacionamento' },
  },
};

const optionsParams = {
  type: 'object',
  required: ['slug', 'targetTableSlug', 'fieldId'],
  properties: {
    slug: { type: 'string', description: 'Slug da tabela de origem' },
    targetTableSlug: {
      type: 'string',
      description: 'Slug da tabela alvo do relacionamento',
    },
    fieldId: { type: 'string', description: 'ID do campo de relacionamento' },
  },
};

export const CascadeDropdownGetConfigSchema = {
  tags: ['Dropdown em Cascata'],
  summary: 'Obter configuração do dropdown em cascata',
  description:
    'Busca a configuração do dropdown em cascata de um campo de relacionamento.',
  params: configParams,
  response: {
    200: configResponseSchema,
    401: ErrorResponse,
    403: ErrorResponse,
    404: ErrorResponse,
  },
};

export const CascadeDropdownSaveConfigSchema = {
  tags: ['Dropdown em Cascata'],
  summary: 'Salvar configuração do dropdown em cascata',
  description:
    'Salva a configuração do dropdown em cascata de um campo de relacionamento.',
  params: configParams,
  body: {
    type: 'object',
    required: [
      'sourceTableId',
      'sourceTableSlug',
      'parentFieldId',
      'parentFieldSlug',
      'childFieldId',
      'childFieldSlug',
    ],
    properties: {
      sourceTableId: { type: 'string' },
      sourceTableSlug: { type: 'string' },
      parentFieldId: { type: 'string' },
      parentFieldSlug: { type: 'string' },
      childFieldId: { type: 'string' },
      childFieldSlug: { type: 'string' },
      enabled: { type: 'boolean' },
      parentWidth: { type: 'number' },
      childWidth: { type: 'number' },
      filters: { type: 'array', items: filterSchema },
    },
  },
  response: {
    200: configResponseSchema,
    400: ErrorResponse,
    401: ErrorResponse,
    403: ErrorResponse,
    404: ErrorResponse,
  },
};

export const CascadeDropdownParentOptionsSchema = {
  tags: ['Dropdown em Cascata'],
  summary: 'Listar opções do campo controlador (pai)',
  description: 'Lista as opções do campo pai do dropdown em cascata.',
  params: optionsParams,
  querystring: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Filtro textual opcional' },
    },
  },
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          value: { type: 'string' },
          label: { type: 'string' },
        },
      },
    },
    401: ErrorResponse,
    403: ErrorResponse,
    404: ErrorResponse,
  },
};

export const CascadeDropdownChildOptionsSchema = {
  tags: ['Dropdown em Cascata'],
  summary: 'Listar opções do campo dependente (filho)',
  description:
    'Lista as opções do campo filho do dropdown em cascata, filtradas pelo valor do pai.',
  params: optionsParams,
  querystring: {
    type: 'object',
    required: ['parentValue'],
    properties: {
      parentValue: {
        type: 'string',
        description: 'Valor selecionado no campo pai',
      },
      search: { type: 'string', description: 'Filtro textual opcional' },
      page: { type: 'number', default: 1, description: 'Página (default 1)' },
      perPage: {
        type: 'number',
        default: 20,
        description: 'Itens por página (default 20)',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: true,
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            perPage: { type: 'number' },
            page: { type: 'number' },
            lastPage: { type: 'number' },
            firstPage: { type: 'number' },
          },
        },
      },
    },
    401: ErrorResponse,
    403: ErrorResponse,
    404: ErrorResponse,
  },
};
