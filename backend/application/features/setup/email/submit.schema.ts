import type { FastifySchema } from 'fastify';

import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import { SetupEmailBodyValidator } from '../_shared.validator';

export const SetupEmailSubmitSchema: FastifySchema = {
  tags: ['Configuração Inicial'],
  summary: 'Configurar provedor de email SMTP no setup wizard',
  description:
    'Define as credenciais SMTP para envio de emails. Etapa 6 (final) do setup wizard. Todos os campos são opcionais.',
  security: [{ cookieAuth: [] }],
  body: zodToRouteSchema(SetupEmailBodyValidator),
  response: {
    200: {
      description: 'Setup concluído com sucesso',
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
    500: buildErrorResponse(
      500,
      ['SETUP_EMAIL_ERROR', 'SETUP_COMPLETE_FAILED'],
      {
        description: 'Erro interno',
      },
    ),
  },
};
