import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const SetupLogosSubmitSchema: FastifySchema = {
  tags: ['Configuração Inicial'],
  summary: 'Configurar logos do sistema no setup wizard',
  description:
    'Define as URLs dos logos pequeno e grande. Etapa 3 do setup wizard.',
  security: [{ cookieAuth: [] }],
  body: {
    type: 'object',
    properties: {
      LOGO_SMALL_URL: {
        type: 'string',
        nullable: true,
        description: 'URL do logo pequeno',
      },
      LOGO_LARGE_URL: {
        type: 'string',
        nullable: true,
        description: 'URL do logo grande',
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Logos salvos com sucesso',
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
    500: buildErrorResponse(500, 'SETUP_LOGOS_ERROR', {
      description: 'Erro interno',
    }),
  },
};
