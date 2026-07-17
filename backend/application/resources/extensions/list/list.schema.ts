import type { FastifySchema } from 'fastify';

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

const serverErrorBlock = {
  description: 'Erro interno do servidor',
  type: 'object',
  properties: {
    message: { type: 'string' },
    code: { type: 'number', enum: [500] },
    cause: { type: 'string', enum: ['LIST_EXTENSIONS_ERROR'] },
    errors: { type: 'object', additionalProperties: { type: 'string' } },
  },
} as const;

export const ExtensionListSchema: FastifySchema = {
  tags: ['Extensões'],
  summary: 'Lista todas as extensões registradas',
  description:
    'Retorna todas as extensões descobertas pelo loader, incluindo desativadas e indisponíveis. Restrito ao usuário MASTER.',
  security: [{ cookieAuth: [] }],
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          pkg: { type: 'string' },
          type: { type: 'string', enum: ['PLUGIN', 'MODULE', 'TOOL'] },
          extensionId: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          version: { type: 'string' },
          author: { type: 'string', nullable: true },
          icon: { type: 'string', nullable: true },
          image: { type: 'string', nullable: true },
          slots: { type: 'array', items: { type: 'string' } },
          route: { type: 'string', nullable: true },
          configRoute: { type: 'string', nullable: true },
          submenu: { type: 'string', nullable: true },
          enabled: { type: 'boolean' },
          available: { type: 'boolean' },
          tableScope: {
            type: 'object',
            properties: {
              mode: { type: 'string', enum: ['all', 'specific'] },
              tableIds: { type: 'array', items: { type: 'string' } },
            },
          },
          requires: {
            type: 'object',
            additionalProperties: true,
          },
          manifestSnapshot: {
            type: 'object',
            additionalProperties: true,
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    401: unauthorizedBlock,
    403: forbiddenBlock,
    500: serverErrorBlock,
  },
};
