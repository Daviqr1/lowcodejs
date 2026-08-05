import type { FastifySchema } from 'fastify';

import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import { SignUpBodyValidator } from '../_shared.validator';

export const SignUpSchema: FastifySchema = {
  tags: ['Autenticação'],
  summary: 'Registrar novo usuário (cadastro)',
  description:
    'Cria uma nova conta de usuário com nome, email e senha (grupo REGISTERED) e enfileira um email de boas-vindas (efeito colateral). Retorna 201 sem corpo. Rota pública',
  body: zodToRouteSchema(SignUpBodyValidator),
  response: {
    201: {
      description: 'Usuário criado com sucesso',
      type: 'null',
    },
    400: buildErrorResponse(400, 'INVALID_PAYLOAD_FORMAT', {
      description: 'Requisição inválida - Falha na validação',
    }),
    409: buildErrorResponse(409, ['USER_ALREADY_EXISTS', 'GROUP_NOT_FOUND'], {
      description: 'Conflito - Usuário já existe ou grupo não encontrado',
    }),
    500: buildErrorResponse(500, 'SIGN_UP_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
