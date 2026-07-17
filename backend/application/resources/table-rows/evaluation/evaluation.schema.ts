import type { FastifySchema } from 'fastify';

export const TableRowEvaluationSchema: FastifySchema = {
  tags: ['Registros'],
  summary: 'Adiciona avaliação a um registro',
  description:
    'Adiciona ou atualiza uma avaliação numérica do usuário em um campo de avaliação de um registro. Cada usuário tem uma única avaliação por campo (upsert). Retorna o registro atualizado.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['slug', '_id'],
    properties: {
      slug: {
        type: 'string',
        description: 'Slug da tabela que contém o registro',
      },
      _id: { type: 'string', description: 'ID do registro a avaliar' },
    },
    additionalProperties: false,
  },
  body: {
    type: 'object',
    required: ['value', 'field'],
    properties: {
      value: {
        type: 'number',
        description: 'Valor numérico da avaliação',
      },
      field: {
        type: 'string',
        description: 'Slug do campo de avaliação (tipo EVALUATION)',
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Avaliação registrada - Retorna o registro atualizado',
      type: 'object',
      properties: {
        _id: { type: 'string', description: 'ID do registro' },
        creator: {
          type: 'string',
          nullable: true,
          description: 'ID do criador',
        },
        trashed: { type: 'boolean', description: 'Se está na lixeira' },
        trashedAt: {
          type: 'string',
          format: 'date-time',
          nullable: true,
          description: 'Data de envio para lixeira',
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          description: 'Data de criação',
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          description: 'Data da última atualização',
        },
      },
      additionalProperties: true,
    },
    401: {
      description: 'Não autorizado - Autenticação necessária',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [401] },
        cause: {
          type: 'string',
          enum: ['AUTHENTICATION_REQUIRED', 'USER_NOT_AUTHENTICATED'],
        },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    403: {
      description: 'Acesso negado - Permissão insuficiente',
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
            'RESTRICTED_CREATE',
            'FORM_VIEW_RESTRICTED',
          ],
        },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    404: {
      description: 'Tabela ou registro não encontrado',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [404] },
        cause: {
          type: 'string',
          enum: ['TABLE_NOT_FOUND', 'ROW_NOT_FOUND'],
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
        cause: { type: 'string', enum: ['EVALUATION_ROW_TABLE_ERROR'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};
