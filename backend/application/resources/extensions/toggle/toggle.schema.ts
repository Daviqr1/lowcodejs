import type { FastifySchema } from 'fastify';

const badRequestBlock = {
  description: 'Requisição inválida',
  type: 'object',
  properties: {
    message: { type: 'string' },
    code: { type: 'number', enum: [400] },
    cause: {
      type: 'string',
      enum: ['EXTENSION_UNAVAILABLE', 'INVALID_PAYLOAD_FORMAT'],
    },
    errors: { type: 'object', additionalProperties: { type: 'string' } },
  },
} as const;

const unauthorizedBlock = {
  description: 'Não autorizado - Autenticação necessária',
  type: 'object',
  properties: {
    message: { type: 'string' },
    code: { type: 'number', enum: [401] },
    cause: { type: 'string', enum: ['AUTHENTICATION_REQUIRED'] },
    errors: { type: 'object', additionalProperties: { type: 'string' } },
  },
} as const;

const forbiddenBlock = {
  description: 'Acesso negado - Permissão insuficiente',
  type: 'object',
  properties: {
    message: { type: 'string' },
    code: { type: 'number', enum: [403] },
    cause: { type: 'string', enum: ['FORBIDDEN'] },
    errors: { type: 'object', additionalProperties: { type: 'string' } },
  },
} as const;

const notFoundBlock = {
  description: 'Extensão não encontrada',
  type: 'object',
  properties: {
    message: { type: 'string' },
    code: { type: 'number', enum: [404] },
    cause: { type: 'string', enum: ['EXTENSION_NOT_FOUND'] },
    errors: { type: 'object', additionalProperties: { type: 'string' } },
  },
} as const;

const serverErrorBlock = {
  description: 'Erro interno do servidor',
  type: 'object',
  properties: {
    message: { type: 'string' },
    code: { type: 'number', enum: [500] },
    cause: { type: 'string', enum: ['TOGGLE_EXTENSION_ERROR'] },
    errors: { type: 'object', additionalProperties: { type: 'string' } },
  },
} as const;

export const ExtensionToggleSchema: FastifySchema = {
  tags: ['Extensões'],
  summary: 'Ativa ou desativa uma extensão',
  description:
    'Alterna o flag enabled. Tentar habilitar uma extensão indisponível resulta em 400. Restrito ao usuário MASTER.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    properties: { _id: { type: 'string' } },
    required: ['_id'],
  },
  body: {
    type: 'object',
    properties: {
      enabled: { type: 'boolean' },
    },
    required: ['enabled'],
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        enabled: { type: 'boolean' },
        available: { type: 'boolean' },
      },
      additionalProperties: true,
    },
    400: badRequestBlock,
    401: unauthorizedBlock,
    403: forbiddenBlock,
    404: notFoundBlock,
    500: serverErrorBlock,
  },
};
