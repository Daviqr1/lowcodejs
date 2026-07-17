import type { FastifySchema } from 'fastify';

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
    409: {
      description: 'Conflito - Usuário já existe ou grupo não encontrado',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [409] },
        cause: {
          type: 'string',
          enum: ['USER_ALREADY_EXISTS', 'GROUP_NOT_FOUND'],
        },
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
        cause: { type: 'string', enum: ['SIGN_UP_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
