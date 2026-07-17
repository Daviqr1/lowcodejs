import type { FastifySchema } from 'fastify';

export const SetupPagingSubmitSchema: FastifySchema = {
  tags: ['Configuração Inicial'],
  summary: 'Configurar paginação e templates de clone no setup wizard',
  description:
    'Define itens por página e tabelas disponíveis para clone. Etapa 5 do setup wizard.',
  security: [{ cookieAuth: [] }],
  body: {
    type: 'object',
    required: ['PAGINATION_PER_PAGE'],
    properties: {
      PAGINATION_PER_PAGE: {
        type: 'number',
        minimum: 1,
        description: 'Quantidade de itens por página',
      },
      MODEL_CLONE_TABLES: {
        type: 'array',
        items: { type: 'string' },
        description: 'IDs das tabelas disponíveis para clone',
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Configurações de paginação salvas com sucesso',
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
        cause: { type: 'string', enum: ['SETUP_PAGING_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
