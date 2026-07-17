import type { FastifySchema } from 'fastify';

export const SetupStorageSubmitSchema: FastifySchema = {
  tags: ['Configuração Inicial'],
  summary: 'Configurar driver de armazenamento no setup wizard',
  description:
    'Define o driver de armazenamento (local ou S3) e credenciais. Etapa 3 do setup wizard.',
  security: [{ cookieAuth: [] }],
  body: {
    type: 'object',
    required: ['STORAGE_DRIVER'],
    properties: {
      STORAGE_DRIVER: {
        type: 'string',
        enum: ['local', 's3'],
        description: 'Driver de armazenamento',
      },
      STORAGE_ENDPOINT: {
        type: 'string',
        description: 'URL do endpoint S3',
      },
      STORAGE_REGION: {
        type: 'string',
        description: 'Região do bucket S3',
      },
      STORAGE_BUCKET: {
        type: 'string',
        description: 'Nome do bucket S3',
      },
      STORAGE_ACCESS_KEY: {
        type: 'string',
        description: 'Access key do S3',
      },
      STORAGE_SECRET_KEY: {
        type: 'string',
        description: 'Secret key do S3',
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Configuração de armazenamento salva com sucesso',
      type: 'object',
      properties: {
        completed: { type: 'boolean' },
        currentStep: { type: 'string', nullable: true },
        hasAdmin: { type: 'boolean' },
        steps: { type: 'array', items: { type: 'string' } },
      },
    },
    400: {
      description: 'Erro de validação',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [400] },
        cause: { type: 'string' },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    401: {
      description: 'Não autenticado',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [401] },
        cause: { type: 'string', enum: ['AUTHENTICATION_REQUIRED'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    403: {
      description: 'Sem permissão',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [403] },
        cause: { type: 'string', enum: ['FORBIDDEN'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    409: {
      description: 'Conflito (setup já concluído)',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [409] },
        cause: { type: 'string', enum: ['SETUP_ALREADY_COMPLETED'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    412: {
      description: 'Etapa incorreta do setup',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [412] },
        cause: { type: 'string', enum: ['SETUP_WRONG_STEP'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    500: {
      description: 'Erro interno',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['SETUP_STORAGE_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
