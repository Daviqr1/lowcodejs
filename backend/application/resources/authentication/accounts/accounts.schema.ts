import type { FastifySchema } from 'fastify';

export const AuthenticationAccountsSchema: FastifySchema = {
  tags: ['Autenticação'],
  summary: 'Listar contas autenticadas',
  description:
    'Lista as contas autenticadas neste navegador usando os cookies httpOnly de refresh token.',
  response: {
    200: {
      description: 'Contas autenticadas listadas com sucesso',
      type: 'object',
      properties: {
        activeAccountId: { type: ['string', 'null'] },
        accounts: {
          type: 'array',
          items: { type: 'object', additionalProperties: true },
        },
      },
      required: ['activeAccountId', 'accounts'],
    },
  },
};
