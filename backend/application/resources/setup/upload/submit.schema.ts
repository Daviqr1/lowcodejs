import type { FastifySchema } from 'fastify';

import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import { SetupUploadBodyValidator } from './submit.validator';

export const SetupUploadSubmitSchema: FastifySchema = {
  tags: ['Configuração Inicial'],
  summary: 'Configurar limites de upload no setup wizard',
  description:
    'Define tamanho máximo, extensões aceitas e máximo de arquivos por upload. Etapa 4 do setup wizard.',
  security: [{ cookieAuth: [] }],
  body: zodToRouteSchema(SetupUploadBodyValidator),
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
    500: buildErrorResponse(500, 'SETUP_UPLOAD_ERROR', {
      description: 'Erro interno',
    }),
  },
};
