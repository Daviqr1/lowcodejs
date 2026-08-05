import type { FastifySchema } from 'fastify';

import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import { ResetPasswordBodyValidator } from '../_shared.validator';

export const ResetPasswordSchema: FastifySchema = {
  tags: ['Autenticação'],
  summary: 'Atualizar senha após recuperação',
  description:
    'Atualiza a senha do usuário identificado pelo token de sessão (definido após a validação do código) e enfileira um email de confirmação (efeito colateral). Retorna 200 sem corpo',
  body: zodToRouteSchema(ResetPasswordBodyValidator),
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
