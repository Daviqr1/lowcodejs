import type { FastifySchema } from 'fastify';

export const UserGroupBulkDeleteSchema: FastifySchema = {
  tags: ['Grupos de Usuários'],
  summary: 'Excluir permanentemente múltiplos grupos',
  description:
    'Exclui permanentemente os grupos elegíveis (já na lixeira, não-sistema e sem usuários atribuídos) e retorna a quantidade efetivamente removida. Restrito ao MASTER.',
  security: [{ cookieAuth: [] }],
  body: {
    type: 'object',
    required: ['ids'],
    properties: {
      ids: { type: 'array', items: { type: 'string' }, minItems: 1 },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Quantidade de grupos excluídos permanentemente',
      type: 'object',
      properties: {
        deleted: { type: 'number', description: 'Total de grupos excluídos' },
      },
    },
    400: {
      description: 'Requisição inválida - Falha na validação',
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Mensagem de erro de validação',
        },
        code: { type: 'number', enum: [400] },
        cause: { type: 'string', enum: ['INVALID_PAYLOAD_FORMAT'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'Erros de validação por campo',
        },
      },
    },
    401: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [401] },
        cause: { type: 'string', enum: ['AUTHENTICATION_REQUIRED'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    403: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [403] },
        cause: { type: 'string', enum: ['FORBIDDEN'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    500: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['BULK_DELETE_GROUPS_ERROR'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};
