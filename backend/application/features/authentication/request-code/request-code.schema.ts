import type { FastifySchema } from 'fastify';

import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import { RequestCodeBodyValidator } from '../_shared.validator';

export const RequestCodeSchema: FastifySchema = {
  tags: ['Autenticação'],
  summary: 'Solicitar código de recuperação de senha',
  description:
    'Gera um código de recuperação de senha e o enfileira para envio por email ao endereço informado (efeito colateral). Retorna 200 sem corpo. Rota pública',
  body: zodToRouteSchema(RequestCodeBodyValidator),
  response: {
    200: {
      description: 'Código de recuperação enfileirado com sucesso',
      type: 'null',
    },
    400: buildErrorResponse(400, 'INVALID_PAYLOAD_FORMAT', {
      description: 'Requisição inválida - Falha na validação',
    }),
    404: buildErrorResponse(404, 'EMAIL_NOT_FOUND', {
      description: 'Não encontrado - Email não cadastrado',
    }),
    500: buildErrorResponse(500, 'REQUEST_CODE_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
