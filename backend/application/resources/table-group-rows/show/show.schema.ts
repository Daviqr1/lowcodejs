import type { FastifySchema } from 'fastify';

export const GroupRowShowSchema: FastifySchema = {
  tags: ['Registros de Grupo'],
  summary: 'Buscar item do grupo',
  description:
    'Retorna um item (subdocumento) específico pelo seu ID dentro de um campo FIELD_GROUP. Campos de senha são mascarados.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['slug', 'rowId', 'groupSlug', 'itemId'],
    properties: {
      slug: { type: 'string', description: 'Slug da tabela' },
      rowId: { type: 'string', description: 'ID da row pai' },
      groupSlug: { type: 'string', description: 'Slug do grupo (FIELD_GROUP)' },
      itemId: { type: 'string', description: 'ID do item embutido' },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Detalhes do item do grupo',
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
        cause: { type: 'string', enum: ['GET_GROUP_ROW_ERROR'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};
