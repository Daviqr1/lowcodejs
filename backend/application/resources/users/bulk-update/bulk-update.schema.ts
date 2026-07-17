import type { FastifySchema } from 'fastify';

export const UserBulkUpdateSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Alterar status de múltiplos usuários',
  description:
    'Define o mesmo status (ACTIVE/INACTIVE) em vários usuários de uma vez. O próprio usuário é sempre excluído (não pode alterar o próprio status). Retorna o número de usuários modificados.',
  security: [{ cookieAuth: [] }],
  body: {
    type: 'object',
    required: ['ids', 'status'],
    properties: {
      ids: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 500,
        description: 'Lista de IDs de usuários a atualizar',
      },
      status: {
        type: 'string',
        enum: ['ACTIVE', 'INACTIVE'],
        description: 'Novo status aplicado a todos os usuários selecionados',
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Usuários atualizados com sucesso',
      type: 'object',
      properties: {
        modified: {
          type: 'number',
          description: 'Número de usuários cujo status foi atualizado',
        },
      },
    },
    400: {
      description: 'Requisição inválida - Parâmetros inválidos',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [400] },
        cause: { type: 'string', enum: ['INVALID_PAYLOAD_FORMAT'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    401: {
      description: 'Não autorizado - Autenticação necessária',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [401] },
        cause: { type: 'string', enum: ['AUTHENTICATION_REQUIRED'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    403: {
      description: 'Proibido - Permissão insuficiente',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [403] },
        cause: { type: 'string', enum: ['FORBIDDEN'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    500: {
      description: 'Erro interno do servidor',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['BULK_UPDATE_USERS_ERROR'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};
