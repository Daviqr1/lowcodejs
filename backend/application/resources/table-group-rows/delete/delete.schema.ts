import type { FastifySchema } from 'fastify';

export const GroupRowDeleteSchema: FastifySchema = {
  tags: ['Registros de Grupo'],
  summary: 'Excluir item do grupo',
  description:
    'Remove permanentemente um item (subdocumento) do array de um campo FIELD_GROUP dentro de uma row. É um hard delete.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['slug', 'rowId', 'groupSlug', 'itemId'],
    properties: {
      slug: { type: 'string', description: 'Slug da tabela' },
      rowId: { type: 'string', description: 'ID da row pai' },
      groupSlug: { type: 'string', description: 'Slug do grupo (FIELD_GROUP)' },
      itemId: { type: 'string', description: 'ID do item embutido a excluir' },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Item excluído permanentemente com sucesso',
      type: 'null',
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
      description: 'Acesso negado - Permissão insuficiente para a tabela',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [403] },
        cause: {
          type: 'string',
          enum: [
            'USER_NOT_FOUND',
            'USER_NOT_ACTIVE',
            'PERMISSIONS_NOT_FOUND',
            'INSUFFICIENT_PERMISSIONS',
            'OWNER_OR_ADMIN_REQUIRED',
            'TABLE_PRIVATE',
            'FORM_VIEW_RESTRICTED',
            'RESTRICTED_CREATE',
          ],
        },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    404: {
      description: 'Tabela, row, grupo ou item não encontrado',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [404] },
        cause: {
          type: 'string',
          enum: [
            'TABLE_NOT_FOUND',
            'ROW_NOT_FOUND',
            'GROUP_NOT_FOUND',
            'ITEM_NOT_FOUND',
          ],
        },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    500: {
      description: 'Erro interno do servidor',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['DELETE_GROUP_ROW_ERROR'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};
