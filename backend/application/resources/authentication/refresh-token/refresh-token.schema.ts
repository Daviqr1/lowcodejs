import type { FastifySchema } from 'fastify';

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
    401: {
      description:
        'Não autorizado - Refresh token ausente, inválido ou expirado',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [401] },
        cause: {
          type: 'string',
          enum: ['MISSING_REFRESH_TOKEN', 'INVALID_REFRESH_TOKEN'],
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    404: {
      description: 'Não encontrado - Usuário não encontrado',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [404] },
        cause: { type: 'string', enum: ['USER_NOT_FOUND'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    500: {
      description: 'Erro interno do servidor',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['REFRESH_TOKEN_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
