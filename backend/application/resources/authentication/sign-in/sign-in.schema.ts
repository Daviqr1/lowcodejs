import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const SignInSchema: FastifySchema = {
  tags: ['Autenticação'],
  summary: 'Autenticar usuário (login)',
  description:
    'Autentica um usuário com email e senha. Em caso de sucesso, define os cookies httpOnly accessToken e refreshToken (efeito colateral) e retorna 200 sem corpo. Rota pública',
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        description: 'Email do usuário',
        errorMessage: {
          type: 'O email deve ser um texto',
          format: 'Digite um email válido',
        },
      },
      password: {
        type: 'string',
        minLength: 1,
        description: 'Senha do usuário',
        errorMessage: {
          type: 'A senha deve ser um texto',
          minLength: 'A senha é obrigatória',
        },
      },
    },
    additionalProperties: false,
    errorMessage: {
      required: {
        email: 'O email é obrigatório',
        password: 'A senha é obrigatória',
      },
      additionalProperties: 'Campos extras não são permitidos',
    },
  },
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
