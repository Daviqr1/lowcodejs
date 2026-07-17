const Rule = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'sourceFieldId', 'sourceFieldSlug', 'sourceValue'],
  properties: {
    id: { type: 'string' },
    label: { type: 'string' },
    sourceFieldId: { type: 'string' },
    sourceFieldSlug: { type: 'string' },
    sourceValue: { type: 'string' },
    showFieldIds: { type: 'array', items: { type: 'string' } },
    hideFieldIds: { type: 'array', items: { type: 'string' } },
  },
};

const ConfigResponse = {
  type: 'object',
  additionalProperties: true,
  required: ['tableId', 'tableSlug', 'rules'],
  properties: {
    _id: { type: 'string' },
    tableId: { type: 'string' },
    tableSlug: { type: 'string' },
    rules: { type: 'array', items: Rule },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
};

export const GetConditionalFieldsConfigSchema = {
  tags: ['Plugins'],
  summary: 'Busca a configuração de campos condicionais da tabela.',
  response: {
    200: ConfigResponse,
  },
};

export const GetConditionalFieldsRuntimeConfigSchema = {
  tags: ['Plugins'],
  summary:
    'Busca a configuração de campos condicionais para uso no formulário.',
  response: {
    200: ConfigResponse,
  },
};

export const UpdateConditionalFieldsConfigSchema = {
  tags: ['Plugins'],
  summary: 'Atualiza a configuração de campos condicionais da tabela.',
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['rules'],
    properties: {
      rules: { type: 'array', items: Rule },
    },
  },
  response: {
    200: ConfigResponse,
  },
};
