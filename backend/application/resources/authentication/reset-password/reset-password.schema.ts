import type { FastifySchema } from 'fastify';

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
    400: {
      description: 'Requisição inválida - Falha na validação',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [400] },
        cause: { type: 'string', enum: ['INVALID_PAYLOAD_FORMAT'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    401: {
      description: 'Não autorizado - Autenticação necessária',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [401] },
        cause: { type: 'string', enum: ['AUTHENTICATION_REQUIRED'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    404: {
      description: 'Não encontrado - Usuário não encontrado',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [404] },
        cause: { type: 'string', enum: ['USER_NOT_FOUND'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    500: {
      description: 'Erro interno do servidor',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['UPDATE_PASSWORD_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
