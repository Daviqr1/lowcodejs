import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const RefreshTokenSchema: FastifySchema = {
  tags: ['Autenticação'],
  summary: 'Renovar tokens de autenticação',
  description:
    'Renova os tokens de acesso e refresh a partir do cookie refreshToken. A autenticação se dá pela posse do refresh token (não pelo access token). Em caso de sucesso, define os cookies httpOnly accessToken e refreshToken (efeito colateral) e retorna 200 sem corpo. Rota pública',
  response: {
    200: {
      description:
        'Tokens renovados com sucesso - define os cookies httpOnly accessToken e refreshToken',
      type: 'null',
    },
    401: buildErrorResponse(
      401,
      ['MISSING_REFRESH_TOKEN', 'INVALID_REFRESH_TOKEN'],
      {
        description:
          'Não autorizado - Refresh token ausente, inválido ou expirado',
      },
    ),
    404: buildErrorResponse(404, 'USER_NOT_FOUND', {
      description: 'Não encontrado - Usuário não encontrado',
    }),
    500: buildErrorResponse(500, 'REFRESH_TOKEN_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
