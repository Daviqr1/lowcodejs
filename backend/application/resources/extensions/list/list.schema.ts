import type { FastifySchema } from 'fastify';

const errorBlock = {
  type: 'object',
  properties: {
    message: { type: 'string' },
    code: { type: 'number' },
    cause: { type: 'string' },
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
          slot: { type: 'string', nullable: true },
          route: { type: 'string', nullable: true },
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
          tableSettings: {
            type: 'object',
            additionalProperties: true,
          },
          supportsScopeAll: { type: 'boolean' },
          category: { type: 'string', nullable: true },
          hasSettingsSchema: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    401: errorBlock,
    403: errorBlock,
    500: errorBlock,
  },
};
