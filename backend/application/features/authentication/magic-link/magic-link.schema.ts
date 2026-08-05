import type { FastifySchema } from 'fastify';

import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import { MagicLinkQueryValidator } from '../_shared.validator';

export const MagicLinkSchema: FastifySchema = {
  tags: ['Autenticação'],
  summary: 'Autenticação via magic link',
  description:
    'Autentica o usuário via código (magic link) na query string. Em caso de sucesso, define os cookies httpOnly accessToken e refreshToken (efeito colateral) e redireciona (302) para o dashboard. Rota pública',
  querystring: zodToRouteSchema(MagicLinkQueryValidator),
  response: {
    302: {
      description:
        'Autenticação bem-sucedida - define os cookies httpOnly e redireciona para o dashboard',
      type: 'null',
    },
    400: buildErrorResponse(400, 'INVALID_PAYLOAD_FORMAT', {
      description: 'Requisição inválida - Falha na validação',
    }),
    404: buildErrorResponse(
      404,
      ['VALIDATION_TOKEN_NOT_FOUND', 'USER_NOT_FOUND'],
      {
        description:
          'Não encontrado - Token de validação ou usuário não encontrado',
      },
    ),
    409: buildErrorResponse(409, 'VALIDATION_TOKEN_ALREADY_USED', {
      description: 'Conflito - Token de validação já utilizado',
    }),
    410: buildErrorResponse(410, 'VALIDATION_TOKEN_EXPIRED', {
      description: 'Expirado - Token de validação expirado',
    }),
    500: buildErrorResponse(500, 'MAGIC_LINK_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
