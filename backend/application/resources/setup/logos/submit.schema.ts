import type { FastifySchema } from 'fastify';

export const SetupLogosSubmitSchema: FastifySchema = {
  tags: ['Configuração Inicial'],
  summary: 'Configurar logos do sistema no setup wizard',
  description:
    'Define as URLs dos logos pequeno e grande. Etapa 3 do setup wizard.',
  security: [{ cookieAuth: [] }],
  body: {
    type: 'object',
    properties: {
      LOGO_SMALL_URL: {
        type: 'string',
        nullable: true,
        description: 'URL do logo pequeno',
      },
      LOGO_LARGE_URL: {
        type: 'string',
        nullable: true,
        description: 'URL do logo grande',
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Logos salvos com sucesso',
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
        cause: { type: 'string', enum: ['SETUP_LOGOS_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
