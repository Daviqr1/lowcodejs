import type { FastifySchema } from 'fastify';

const badRequestBlock = {
  description: 'Requisição inválida',
  type: 'object',
  properties: {
    message: { type: 'string' },
    code: { type: 'number', enum: [400] },
    cause: {
      type: 'string',
      enum: [
        'CONFIRM_REQUIRED',
        'NO_FILES_TO_CLEANUP',
        'INVALID_PAYLOAD_FORMAT',
      ],
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
  description: 'Conflito - Operação em andamento ou migração não finalizada',
  type: 'object',
  properties: {
    message: { type: 'string' },
    code: { type: 'number', enum: [409] },
    cause: {
      type: 'string',
      enum: ['MIGRATION_ALREADY_RUNNING', 'CLEANUP_NOT_READY'],
    },
    errors: { type: 'object', additionalProperties: { type: 'string' } },
  },
} as const;

const serverErrorBlock = {
  description: 'Erro interno do servidor',
  type: 'object',
  properties: {
    message: { type: 'string' },
    code: { type: 'number', enum: [500] },
    cause: { type: 'string', enum: ['STORAGE_MIGRATION_CLEANUP_ERROR'] },
    errors: { type: 'object', additionalProperties: { type: 'string' } },
  },
} as const;

export const StorageMigrationCleanupSchema: FastifySchema = {
  tags: ['Migração de Armazenamento'],
  summary: 'Limpa arquivos do driver antigo após migração',
  description:
    'Apaga fisicamente os arquivos que ficaram no driver antigo após a migração. Restrito ao MASTER.',
  security: [{ cookieAuth: [] }],
  body: {
    type: 'object',
    properties: {
      confirm: { type: 'boolean' },
    },
    required: ['confirm'],
    additionalProperties: false,
  },
  response: {
    202: {
      description: 'Limpeza enfileirada com sucesso',
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
