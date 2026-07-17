import type { FastifySchema } from 'fastify';

export const MagicLinkSchema: FastifySchema = {
  tags: ['Autenticação'],
  summary: 'Autenticação via magic link',
  description:
    'Autentica o usuário via código (magic link) na query string. Em caso de sucesso, define os cookies httpOnly accessToken e refreshToken (efeito colateral) e redireciona (302) para o dashboard. Rota pública',
  querystring: {
    type: 'object',
    required: ['code'],
    properties: {
      code: {
        type: 'string',
        minLength: 1,
        description: 'Código de autenticação do magic link',
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
    302: {
      description:
        'Autenticação bem-sucedida - define os cookies httpOnly e redireciona para o dashboard',
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
    404: {
      description:
        'Não encontrado - Token de validação ou usuário não encontrado',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [404] },
        cause: {
          type: 'string',
          enum: ['VALIDATION_TOKEN_NOT_FOUND', 'USER_NOT_FOUND'],
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    409: {
      description: 'Conflito - Token de validação já utilizado',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [409] },
        cause: { type: 'string', enum: ['VALIDATION_TOKEN_ALREADY_USED'] },
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
        cause: { type: 'string', enum: ['MAGIC_LINK_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
