import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const SetupStatusSchema: FastifySchema = {
  tags: ['Configuração Inicial'],
  summary: 'Verificar status do setup wizard',
  description:
    'Retorna se o setup foi concluído, a etapa atual e se já existe um administrador master',
  response: {
    200: {
      description: 'Status do setup recuperado com sucesso',
      type: 'object',
      properties: {
        completed: {
          type: 'boolean',
          description: 'Indica se o setup foi concluído',
        },
        currentStep: {
          type: 'string',
          nullable: true,
          enum: [
            'admin',
            'name',
            'storage',
            'logos',
            'upload',
            'paging',
            'email',
          ],
          description: 'Etapa atual do setup (null se concluído)',
        },
        hasAdmin: {
          type: 'boolean',
          description: 'Indica se já existe um usuário MASTER',
        },
        steps: {
          type: 'array',
          items: { type: 'string' },
          description: 'Lista ordenada de todas as etapas do setup',
        },
      },
    },
    500: buildErrorResponse(500, 'SETUP_STATUS_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
