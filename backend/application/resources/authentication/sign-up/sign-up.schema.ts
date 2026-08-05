import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const SignUpSchema: FastifySchema = {
  tags: ['Autenticação'],
  summary: 'Registrar novo usuário (cadastro)',
  description:
    'Cria uma nova conta de usuário com nome, email e senha (grupo REGISTERED) e enfileira um email de boas-vindas (efeito colateral). Retorna 201 sem corpo. Rota pública',
  body: {
    type: 'object',
    required: ['name', 'email', 'password'],
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        description: 'Nome completo do usuário',
        errorMessage: {
          type: 'O nome deve ser um texto',
          minLength: 'O nome é obrigatório',
        },
      },
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
        minLength: 6,
        pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*(),.?":{}|<>])',
        description: 'Senha do usuário',
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
        name: 'O nome é obrigatório',
        email: 'O email é obrigatório',
        password: 'A senha é obrigatória',
      },
      additionalProperties: 'Campos extras não são permitidos',
    },
  },
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
