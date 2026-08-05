import type { FastifySchema } from 'fastify';

import { zodToRouteSchema } from '@application/core/schema.core';

import { SignOutBodyValidator } from '../_shared.validator';

export const SignOutSchema: FastifySchema = {
  tags: ['Autenticação'],
  summary: 'Logout do usuário',
  description:
    'Realiza o logout da conta atual ou de todas as contas autenticadas. Requer token de acesso válido',
  security: [{ cookieAuth: [] }],
  body: zodToRouteSchema(SignOutBodyValidator),
  response: {
    200: {
      description: 'Logout realizado com sucesso',
      type: 'object',
      properties: {
        message: { type: 'string', enum: ['Logout realizado com sucesso'] },
        activeAccountId: { type: ['string', 'null'] },
      },
    },
    401: {
      description: 'Não autorizado - Token de acesso inválido ou ausente',
      type: 'object',
      properties: {
        message: { type: 'string', enum: ['Autenticação necessária'] },
        code: { type: 'number', enum: [401] },
        cause: { type: 'string', enum: ['AUTHENTICATION_REQUIRED'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
      examples: [
        {
          message: 'Autenticação necessária',
          code: 401,
          cause: 'AUTHENTICATION_REQUIRED',
        },
      ],
    },
  },
};
