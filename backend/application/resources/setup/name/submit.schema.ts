import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const SetupNameSubmitSchema: FastifySchema = {
  tags: ['Configuração Inicial'],
  summary: 'Configurar nome do sistema e locale no setup wizard',
  description: 'Define o nome do sistema e o idioma. Etapa 2 do setup wizard.',
  security: [{ cookieAuth: [] }],
  body: {
    type: 'object',
    required: ['SYSTEM_NAME', 'LOCALE'],
    properties: {
      SYSTEM_NAME: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        description: 'Nome do sistema',
      },
      LOCALE: {
        type: 'string',
        enum: ['pt-br', 'en-us'],
        description: 'Idioma do sistema',
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Nome e locale salvos com sucesso',
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
    500: buildErrorResponse(500, 'SETUP_NAME_ERROR', {
      description: 'Erro interno',
    }),
  },
};
