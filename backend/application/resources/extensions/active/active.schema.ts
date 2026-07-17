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

const serverErrorBlock = {
  description: 'Erro interno do servidor',
  type: 'object',
  properties: {
    message: { type: 'string' },
    code: { type: 'number', enum: [500] },
    cause: { type: 'string', enum: ['LIST_ACTIVE_EXTENSIONS_ERROR'] },
    errors: { type: 'object', additionalProperties: { type: 'string' } },
  },
} as const;

export const ExtensionActiveListSchema: FastifySchema = {
  tags: ['Extensões'],
  summary: 'Lista extensões ativas (enabled + available)',
  description:
    'Retorna apenas extensões ativadas e disponíveis, sem manifestSnapshot. Disponível para qualquer usuário autenticado — usado pela sidebar e pelos slots.',
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
          requires: { type: 'object', additionalProperties: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    401: unauthorizedBlock,
    500: serverErrorBlock,
  },
};
