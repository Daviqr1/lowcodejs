import type { FastifySchema } from 'fastify';

export const ValidateCodeSchema: FastifySchema = {
  tags: ['Autenticação'],
  summary: 'Validar código de recuperação de senha',
  description:
    'Valida um código de recuperação de senha. Em caso de sucesso, marca o token como utilizado, define os cookies httpOnly accessToken e refreshToken (efeito colateral) e retorna o usuário associado. Rota pública',
  body: {
    type: 'object',
    required: ['code'],
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
    },
    additionalProperties: false,
    errorMessage: {
      required: {
        code: 'O código é obrigatório',
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
    404: {
      description: 'Não encontrado - Token de validação não encontrado',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [404] },
        cause: { type: 'string', enum: ['VALIDATION_TOKEN_NOT_FOUND'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    410: {
      description: 'Expirado - Token de validação expirado',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [410] },
        cause: { type: 'string', enum: ['VALIDATION_TOKEN_EXPIRED'] },
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
        cause: { type: 'string', enum: ['VALIDATE_CODE_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
