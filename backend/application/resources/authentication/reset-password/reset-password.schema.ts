import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const ResetPasswordSchema: FastifySchema = {
  tags: ['Autenticação'],
  summary: 'Atualizar senha após recuperação',
  description:
    'Atualiza a senha do usuário identificado pelo token de sessão (definido após a validação do código) e enfileira um email de confirmação (efeito colateral). Retorna 200 sem corpo',
  body: {
    type: 'object',
    required: ['password'],
    properties: {
      password: {
        type: 'string',
        minLength: 6,
        pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*(),.?":{}|<>])',
        description:
          'Nova senha (mínimo 6 caracteres, deve conter maiúscula, minúscula, número e caractere especial)',
        errorMessage: {
          type: 'A senha deve ser um texto',
          minLength: 'A senha deve ter no mínimo 6 caracteres',
          pattern:
            'A senha deve conter ao menos: 1 maiúscula, 1 minúscula, 1 número e 1 especial',
        },
      },
    },
    additionalProperties: false,
    errorMessage: {
      required: {
        password: 'A senha é obrigatória',
      },
      additionalProperties: 'Campos extras não são permitidos',
    },
  },
  response: {
    200: {
      description: 'Senha atualizada com sucesso',
      type: 'null',
    },
    400: buildErrorResponse(400, 'INVALID_PAYLOAD_FORMAT', {
      description: 'Requisição inválida - Falha na validação',
    }),
    401: buildErrorResponse(401, 'AUTHENTICATION_REQUIRED', {
      description: 'Não autorizado - Autenticação necessária',
    }),
    404: buildErrorResponse(404, 'USER_NOT_FOUND', {
      description: 'Não encontrado - Usuário não encontrado',
    }),
    500: buildErrorResponse(500, 'UPDATE_PASSWORD_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
