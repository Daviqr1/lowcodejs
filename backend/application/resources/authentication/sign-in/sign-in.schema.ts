import type { FastifySchema } from 'fastify';

export const SignInSchema: FastifySchema = {
  tags: ['Autenticação'],
  summary: 'Autenticar usuário (login)',
  description:
    'Autentica um usuário com email e senha. Em caso de sucesso, define os cookies httpOnly accessToken e refreshToken (efeito colateral) e retorna 200 sem corpo. Rota pública',
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
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
        minLength: 1,
        description: 'Senha do usuário',
        errorMessage: {
          type: 'A senha deve ser um texto',
          minLength: 'A senha é obrigatória',
        },
      },
    },
    additionalProperties: false,
    errorMessage: {
      required: {
        email: 'O email é obrigatório',
        password: 'A senha é obrigatória',
      },
      additionalProperties: 'Campos extras não são permitidos',
    },
  },
  response: {
    200: {
      description:
        'Autenticação bem-sucedida - define os cookies httpOnly accessToken e refreshToken',
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
      description: 'Não autorizado - Credenciais inválidas ou usuário inativo',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [401] },
        cause: {
          type: 'string',
          enum: ['INVALID_CREDENTIALS', 'USER_INACTIVE'],
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    409: {
      description: 'Conflito - Limite de contas simultâneas atingido',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [409] },
        cause: { type: 'string', enum: ['MULTI_ACCOUNT_LIMIT_REACHED'] },
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
        cause: { type: 'string', enum: ['SIGN_IN_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
