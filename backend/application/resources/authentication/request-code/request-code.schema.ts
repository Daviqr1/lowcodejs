import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const RequestCodeSchema: FastifySchema = {
  tags: ['Autenticação'],
  summary: 'Solicitar código de recuperação de senha',
  description:
    'Gera um código de recuperação de senha e o enfileira para envio por email ao endereço informado (efeito colateral). Retorna 200 sem corpo. Rota pública',
  body: {
    type: 'object',
    required: ['email'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        description: 'Endereço de email para enviar o código de recuperação',
        errorMessage: {
          type: 'O email deve ser um texto',
          format: 'Digite um email válido',
        },
      },
    },
    additionalProperties: false,
    errorMessage: {
      required: {
        email: 'O email é obrigatório',
      },
      additionalProperties: 'Campos extras não são permitidos',
    },
  },
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
