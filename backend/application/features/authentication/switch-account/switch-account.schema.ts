import type { FastifySchema } from 'fastify';

import { zodToRouteSchema } from '@application/core/schema.core';

import { SwitchAccountBodyValidator } from '../_shared.validator';

export const SwitchAccountSchema: FastifySchema = {
  tags: ['Autenticação'],
  summary: 'Trocar conta ativa',
  description:
    'Define qual conta autenticada deve ser usada nas próximas requisições.',
  body: zodToRouteSchema(SwitchAccountBodyValidator),
  response: {
    200: {
      description: 'Conta ativa atualizada com sucesso',
      type: 'object',
      properties: {
        activeAccountId: { type: 'string' },
      },
      required: ['activeAccountId'],
    },
    401: {
      description: 'Conta ausente ou inválida',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [401] },
        cause: { type: 'string' },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    404: {
      description: 'Usuário não encontrado',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [404] },
        cause: { type: 'string' },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};
