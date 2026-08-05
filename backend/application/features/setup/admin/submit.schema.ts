import type { FastifySchema } from 'fastify';

import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import { SetupAdminBodyValidator } from '../_shared.validator';

export const SetupAdminSubmitSchema: FastifySchema = {
  tags: ['Configuração Inicial'],
  summary: 'Criar administrador MASTER no setup wizard',
  description:
    'Cria o primeiro usuário MASTER e autentica automaticamente. Etapa 1 do setup wizard.',
  body: zodToRouteSchema(SetupAdminBodyValidator),
  response: {
    201: {
      description: 'Administrador criado com sucesso',
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
    409: buildErrorResponse(
      409,
      [
        'SETUP_ALREADY_COMPLETED',
        'USER_ALREADY_EXISTS',
        'MASTER_GROUP_NOT_FOUND',
        'MASTER_ALREADY_EXISTS',
      ],
      {
        description: 'Conflito (setup já concluído ou usuário já existe)',
      },
    ),
    412: buildErrorResponse(412, 'SETUP_WRONG_STEP', {
      description: 'Etapa incorreta do setup',
    }),
    500: buildErrorResponse(500, 'SETUP_ADMIN_ERROR', {
      description: 'Erro interno',
    }),
  },
};
