const errorBlock = {
  type: 'object',
  properties: {
    message: { type: 'string' },
    code: { type: 'number' },
    cause: { type: 'string' },
    errors: { type: 'object', additionalProperties: { type: 'string' } },
  },
};

const responseFieldSchema = {
  type: 'object',
  required: ['key', 'label', 'type'],
  properties: {
    key: { type: 'string', description: 'Chave (slug) do campo de resposta' },
    label: { type: 'string', description: 'Rótulo exibido para o campo' },
    type: {
      type: 'string',
      enum: ['string', 'date', 'number', 'boolean'],
      description: 'Tipo do valor extraído',
    },
  },
};

const documentTypeSchema = {
  type: 'object',
  required: ['id', 'name', 'responseFields'],
  properties: {
    id: {
      type: 'string',
      description: 'Identificador (slug) do tipo de documento',
    },
    name: { type: 'string', description: 'Nome do tipo de documento' },
    description: {
      type: 'string',
      nullable: true,
      description: 'Descrição opcional',
    },
    responseFields: {
      type: 'array',
      items: responseFieldSchema,
      description: 'Campos esperados na resposta da transcrição',
    },
  },
};

const configResponseSchema = {
  type: 'object',
  description: 'Configuração singleton da transcrição de documentos',
  properties: {
    apiUrl: {
      type: 'string',
      nullable: true,
      description: 'URL da API externa de transcrição',
    },
    apiKey: {
      type: 'string',
      nullable: true,
      description: 'Credencial da API externa',
    },
    model: {
      type: 'string',
      nullable: true,
      description: 'Modelo opcional informado à API',
    },
    documentTypes: {
      type: 'array',
      items: documentTypeSchema,
      description: 'Tipos de documento cadastrados',
    },
  },
};

export const GetConfigSchema = {
  tags: ['Transcrição de Documentos'],
  summary: 'Obter configuração da transcrição de documentos',
  description:
    'Retorna a configuração singleton (URL/credencial/modelo da API externa e tipos de documento). Restrito a MASTER e ADMINISTRATOR.',
  response: {
    200: configResponseSchema,
    401: errorBlock,
    403: errorBlock,
    404: errorBlock,
    500: errorBlock,
  },
};

export const UpdateConfigSchema = {
  tags: ['Transcrição de Documentos'],
  summary: 'Atualizar configuração da transcrição de documentos',
  description:
    'Atualiza a configuração singleton via merge parcial (todos os campos opcionais). Restrito a MASTER e ADMINISTRATOR.',
  body: {
    type: 'object',
    properties: {
      apiUrl: {
        type: 'string',
        nullable: true,
        description: 'URL da API externa de transcrição',
      },
      apiKey: {
        type: 'string',
        nullable: true,
        description: 'Credencial da API externa',
      },
      model: {
        type: 'string',
        nullable: true,
        description: 'Modelo opcional informado à API',
      },
      documentTypes: {
        type: 'array',
        items: documentTypeSchema,
        description: 'Tipos de documento cadastrados',
      },
    },
  },
  response: {
    200: configResponseSchema,
    400: errorBlock,
    401: errorBlock,
    403: errorBlock,
    404: errorBlock,
    500: errorBlock,
  },
};

export const TranscribeSchema = {
  tags: ['Transcrição de Documentos'],
  summary: 'Transcrever documento',
  description:
    'Recebe um arquivo via multipart/form-data junto do campo documentTypeId e devolve os campos transcritos pela API externa. Restrito a MASTER e ADMINISTRATOR.',
  consumes: ['multipart/form-data'],
  body: {
    type: 'object',
    required: ['file', 'documentTypeId'],
    properties: {
      file: {
        type: 'string',
        format: 'binary',
        description: 'Arquivo do documento a transcrever',
      },
      documentTypeId: {
        type: 'string',
        description: 'ID do tipo de documento cadastrado na config',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      description: 'Resultado da transcrição',
      properties: {
        documentTypeId: { type: 'string' },
        documentTypeName: { type: 'string' },
        fields: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              label: { type: 'string' },
              type: { type: 'string' },
              value: {},
            },
          },
        },
        raw: {},
      },
    },
    400: errorBlock,
    401: errorBlock,
    403: errorBlock,
    404: errorBlock,
    500: errorBlock,
    502: errorBlock,
  },
};
