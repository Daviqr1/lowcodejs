import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const ValidateCodeSchema: FastifySchema = {
  tags: ['Autenticação'],
  summary: 'Validar código de recuperação de senha',
  description:
    'Valida um código de recuperação de senha. Em caso de sucesso, marca o token como utilizado, define os cookies httpOnly accessToken e refreshToken (efeito colateral) e retorna o usuário associado. Rota pública',
  body: {
    type: 'object',
    required: ['code', 'email'],
    properties: {
      code: {
        type: 'string',
        minLength: 1,
        description: 'Código de recuperação recebido via email',
        errorMessage: {
          type: 'O código deve ser um texto',
          minLength: 'O código é obrigatório',
        },
      },
      email: {
        type: 'string',
        minLength: 1,
        description: 'E-mail que solicitou o código',
        errorMessage: {
          type: 'O e-mail deve ser um texto',
          minLength: 'O e-mail é obrigatório',
        },
      },
    },
    additionalProperties: false,
    errorMessage: {
      required: {
        code: 'O código é obrigatório',
        email: 'O e-mail é obrigatório',
      },
      additionalProperties: 'Campos extras não são permitidos',
    },
  },
  response: {
    200: {
      description:
        'Código validado com sucesso - define os cookies httpOnly e retorna o usuário associado',
      type: 'object',
      properties: {
        user: {
          type: 'object',
          description: 'Usuário associado ao código de recuperação',
          properties: {
            _id: { type: 'string', description: 'ID do usuário' },
            name: { type: 'string', description: 'Nome do usuário' },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email do usuário',
            },
            status: {
              type: 'string',
              enum: ['ACTIVE', 'INACTIVE'],
              description: 'Status do usuário',
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    400: buildErrorResponse(400, 'INVALID_PAYLOAD_FORMAT', {
      description: 'Requisição inválida - Falha na validação',
    }),
    404: buildErrorResponse(404, 'VALIDATION_TOKEN_NOT_FOUND', {
      description: 'Não encontrado - Token de validação não encontrado',
    }),
    409: buildErrorResponse(409, 'VALIDATION_TOKEN_ALREADY_USED', {
      description: 'Conflito - Token de validação já utilizado',
    }),
    410: buildErrorResponse(410, 'VALIDATION_TOKEN_EXPIRED', {
      description: 'Expirado - Token de validação expirado',
    }),
    500: buildErrorResponse(500, 'VALIDATE_CODE_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
