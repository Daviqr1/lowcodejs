import type { FastifySchema } from 'fastify';

export const SetupUploadSubmitSchema: FastifySchema = {
  tags: ['Configuração Inicial'],
  summary: 'Configurar limites de upload no setup wizard',
  description:
    'Define tamanho máximo, extensões aceitas e máximo de arquivos por upload. Etapa 4 do setup wizard.',
  security: [{ cookieAuth: [] }],
  body: {
    type: 'object',
    required: [
      'FILE_UPLOAD_MAX_SIZE',
      'FILE_UPLOAD_ACCEPTED',
      'FILE_UPLOAD_MAX_FILES_PER_UPLOAD',
    ],
    properties: {
      FILE_UPLOAD_MAX_SIZE: {
        type: 'number',
        minimum: 1,
        description: 'Tamanho máximo de arquivo em bytes',
      },
      FILE_UPLOAD_ACCEPTED: {
        type: 'string',
        minLength: 1,
        description: 'Extensões de arquivo aceitas',
      },
      FILE_UPLOAD_MAX_FILES_PER_UPLOAD: {
        type: 'number',
        minimum: 1,
        description: 'Máximo de arquivos por upload',
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Configurações de upload salvas com sucesso',
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
        cause: { type: 'string', enum: ['SETUP_UPLOAD_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
