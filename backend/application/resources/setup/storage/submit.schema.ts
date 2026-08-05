import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

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
    401: buildErrorResponse(401, 'AUTHENTICATION_REQUIRED', {
      description: 'Não autenticado',
    }),
    403: buildErrorResponse(403, 'FORBIDDEN', {
      description: 'Sem permissão',
    }),
    409: buildErrorResponse(409, 'SETUP_ALREADY_COMPLETED', {
      description: 'Conflito (setup já concluído)',
    }),
    412: buildErrorResponse(412, 'SETUP_WRONG_STEP', {
      description: 'Etapa incorreta do setup',
    }),
    500: buildErrorResponse(500, 'SETUP_STORAGE_ERROR', {
      description: 'Erro interno',
    }),
  },
};
