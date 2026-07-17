import type { FastifySchema } from 'fastify';

export const GroupRowListSchema: FastifySchema = {
  tags: ['Registros de Grupo'],
  summary: 'Listar itens do grupo',
  description:
    'Lista todos os itens (subdocumentos) não excluídos de um campo FIELD_GROUP dentro de uma row. Campos de senha são mascarados.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['slug', 'rowId', 'groupSlug'],
    properties: {
      slug: { type: 'string', description: 'Slug da tabela' },
      rowId: { type: 'string', description: 'ID da row pai' },
      groupSlug: { type: 'string', description: 'Slug do grupo (FIELD_GROUP)' },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Lista de itens do grupo',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          _id: { type: 'string', description: 'ID do item embutido' },
          creator: {
            type: 'string',
            nullable: true,
            description: 'ID do usuário criador',
          },
          status: { type: 'string', description: 'Status do item' },
          draftAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Data do rascunho (null quando publicado)',
          },
          trashedAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Data de envio para lixeira',
          },
        },
        additionalProperties: true,
      },
    },
    400: {
      description: 'Requisição inválida - Falha na validação',
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
      description: 'Tabela, row ou grupo não encontrado',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [404] },
        cause: {
          type: 'string',
          enum: ['TABLE_NOT_FOUND', 'ROW_NOT_FOUND', 'GROUP_NOT_FOUND'],
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
        cause: { type: 'string', enum: ['LIST_GROUP_ROWS_ERROR'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};
