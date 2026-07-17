import type { FastifySchema } from 'fastify';

export const SetupEmailSubmitSchema: FastifySchema = {
  tags: ['Configuração Inicial'],
  summary: 'Configurar provedor de email SMTP no setup wizard',
  description:
    'Define as credenciais SMTP para envio de emails. Etapa 6 (final) do setup wizard. Todos os campos são opcionais.',
  security: [{ cookieAuth: [] }],
  body: {
    type: 'object',
    properties: {
      EMAIL_PROVIDER_HOST: {
        type: 'string',
        nullable: true,
        description: 'Host do servidor SMTP',
      },
      EMAIL_PROVIDER_PORT: {
        type: 'number',
        nullable: true,
        description: 'Porta do servidor SMTP',
      },
      EMAIL_PROVIDER_USER: {
        type: 'string',
        nullable: true,
        description: 'Usuário de autenticação SMTP',
      },
      EMAIL_PROVIDER_PASSWORD: {
        type: 'string',
        nullable: true,
        description: 'Senha de autenticação SMTP',
      },
      EMAIL_PROVIDER_FROM: {
        type: 'string',
        nullable: true,
        description: 'Endereço de email remetente',
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Setup concluído com sucesso',
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
    401: {
      description: 'Não autenticado',
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
    403: {
      description: 'Sem permissão',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [403] },
        cause: { type: 'string', enum: ['FORBIDDEN'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    409: {
      description: 'Conflito (setup já concluído)',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [409] },
        cause: { type: 'string', enum: ['SETUP_ALREADY_COMPLETED'] },
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
        cause: {
          type: 'string',
          enum: ['SETUP_EMAIL_ERROR', 'SETUP_COMPLETE_FAILED'],
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
