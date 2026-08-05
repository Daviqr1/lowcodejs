import type { FastifySchema } from 'fastify';

import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import { SignInBodyValidator } from '../_shared.validator';

export const SignInSchema: FastifySchema = {
  tags: ['Autenticação'],
  summary: 'Autenticar usuário (login)',
  description:
    'Autentica um usuário com email e senha. Em caso de sucesso, define os cookies httpOnly accessToken e refreshToken (efeito colateral) e retorna 200 sem corpo. Rota pública',
  body: zodToRouteSchema(SignInBodyValidator),
  response: {
    200: {
      description:
        'Autenticação bem-sucedida - define os cookies httpOnly accessToken e refreshToken',
      type: 'null',
    },
    400: buildErrorResponse(400, 'INVALID_PAYLOAD_FORMAT', {
      description: 'Requisição inválida - Falha na validação',
    }),
    401: buildErrorResponse(401, ['INVALID_CREDENTIALS', 'USER_INACTIVE'], {
      description: 'Não autorizado - Credenciais inválidas ou usuário inativo',
    }),
    409: buildErrorResponse(409, 'MULTI_ACCOUNT_LIMIT_REACHED', {
      description: 'Conflito - Limite de contas simultâneas atingido',
    }),
    500: buildErrorResponse(500, 'SIGN_IN_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
