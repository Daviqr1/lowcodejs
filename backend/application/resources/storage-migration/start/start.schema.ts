import type { FastifySchema } from 'fastify';

const badRequestBlock = {
  description: 'Requisição inválida',
  type: 'object',
  properties: {
    message: { type: 'string' },
    code: { type: 'number', enum: [400] },
    cause: {
      type: 'string',
      enum: ['NO_FILES_TO_MIGRATE', 'INVALID_PAYLOAD_FORMAT'],
    },
    errors: { type: 'object', additionalProperties: { type: 'string' } },
  },
} as const;

const unauthorizedBlock = {
  description: 'Não autorizado - Autenticação necessária',
  type: 'object',
  properties: {
    message: { type: 'string' },
    code: { type: 'number', enum: [401] },
    cause: { type: 'string', enum: ['AUTHENTICATION_REQUIRED'] },
    errors: { type: 'object', additionalProperties: { type: 'string' } },
  },
} as const;

const forbiddenBlock = {
  description: 'Acesso negado - Permissão insuficiente',
  type: 'object',
  properties: {
    message: { type: 'string' },
    code: { type: 'number', enum: [403] },
    cause: { type: 'string', enum: ['FORBIDDEN'] },
    errors: { type: 'object', additionalProperties: { type: 'string' } },
  },
} as const;

const conflictBlock = {
  description: 'Conflito - Já existe uma migração em andamento',
  type: 'object',
  properties: {
    message: { type: 'string' },
    code: { type: 'number', enum: [409] },
    cause: { type: 'string', enum: ['MIGRATION_ALREADY_RUNNING'] },
    errors: { type: 'object', additionalProperties: { type: 'string' } },
  },
} as const;

const serverErrorBlock = {
  description: 'Erro interno do servidor',
  type: 'object',
  properties: {
    message: { type: 'string' },
    code: { type: 'number', enum: [500] },
    cause: { type: 'string', enum: ['STORAGE_MIGRATION_START_ERROR'] },
    errors: { type: 'object', additionalProperties: { type: 'string' } },
  },
} as const;

export const StorageMigrationStartSchema: FastifySchema = {
  tags: ['Migração de Armazenamento'],
  summary: 'Inicia migração de arquivos entre drivers',
  description:
    'Enfileira um job de background que copia todos os arquivos do driver antigo para o atual. Restrito ao usuário MASTER.',
  security: [{ cookieAuth: [] }],
  body: {
    type: 'object',
    properties: {
      concurrency: {
        type: 'number',
        minimum: 1,
        maximum: 20,
        description: 'Número de arquivos copiados em paralelo',
      },
      retry_failed_only: {
        type: 'boolean',
        description:
          'Quando true, processa apenas arquivos com migration_status=failed',
      },
    },
    additionalProperties: false,
  },
  response: {
    202: {
      description: 'Migração enfileirada com sucesso',
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            job_id: { type: 'string' },
            queued_count: { type: 'number' },
          },
        },
      },
    },
    400: badRequestBlock,
    401: unauthorizedBlock,
    403: forbiddenBlock,
    409: conflictBlock,
    500: serverErrorBlock,
  },
};
