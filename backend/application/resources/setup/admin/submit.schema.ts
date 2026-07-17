import type { FastifySchema } from 'fastify';

export const SetupAdminSubmitSchema: FastifySchema = {
  tags: ['Configuração Inicial'],
  summary: 'Criar administrador MASTER no setup wizard',
  description:
    'Cria o primeiro usuário MASTER e autentica automaticamente. Etapa 1 do setup wizard.',
  body: {
    type: 'object',
    required: ['name', 'email', 'password', 'confirmPassword'],
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        description: 'Nome do administrador',
      },
      email: {
        type: 'string',
        format: 'email',
        description: 'Email do administrador',
      },
      password: {
        type: 'string',
        minLength: 6,
        description:
          'Senha (mín. 6 caracteres, 1 maiúscula, 1 minúscula, 1 número, 1 especial)',
      },
      confirmPassword: {
        type: 'string',
        minLength: 1,
        description: 'Confirmação da senha',
      },
    },
    additionalProperties: false,
  },
  response: {
    201: {
      description: 'Administrador criado com sucesso',
      type: 'object',
      properties: {
        completed: { type: 'boolean' },
        currentStep: { type: 'string', nullable: true },
        hasAdmin: { type: 'boolean' },
        steps: { type: 'array', items: { type: 'string' } },
      },
    },
    400: {
      description: 'Erro de validação',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [400] },
        cause: { type: 'string' },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    409: {
      description: 'Conflito (setup já concluído ou usuário já existe)',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [409] },
        cause: {
          type: 'string',
          enum: [
            'SETUP_ALREADY_COMPLETED',
            'USER_ALREADY_EXISTS',
            'MASTER_GROUP_NOT_FOUND',
            'MASTER_ALREADY_EXISTS',
          ],
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    412: {
      description: 'Etapa incorreta do setup',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [412] },
        cause: { type: 'string', enum: ['SETUP_WRONG_STEP'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    500: {
      description: 'Erro interno',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['SETUP_ADMIN_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
