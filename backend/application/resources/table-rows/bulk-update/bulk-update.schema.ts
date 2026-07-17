import type { FastifySchema } from 'fastify';

export const BulkUpdateSchema: FastifySchema = {
  tags: ['Registros'],
  summary: 'Atualizar campos de registros em lote',
  description:
    'Aplica o mesmo payload parcial `data` a múltiplos registros em uma requisição. Cada registro passa pelo fluxo de atualização individual (validação, hash de senha, script beforeSave e notificação de menções). Best-effort: registros que falham são reportados em `errors` (id -> cause) e não abortam o lote.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['slug'],
    properties: {
      slug: {
        type: 'string',
        description: 'Slug da tabela que contém os registros',
      },
    },
    additionalProperties: false,
  },
  body: {
    type: 'object',
    required: ['ids', 'data'],
    properties: {
      ids: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 200,
        description: 'IDs dos registros a atualizar',
      },
      data: {
        type: 'object',
        minProperties: 1,
        additionalProperties: true,
        description: 'Mapa parcial de campos aplicado a cada registro',
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Registros atualizados (best-effort)',
      type: 'object',
      properties: {
        modified: {
          type: 'number',
          description: 'Quantidade de registros atualizados com sucesso',
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'Mapa id do registro -> causa da falha',
        },
      },
    },
    400: {
      description: 'Requisição inválida - Falha na validação',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [400] },
        cause: {
          type: 'string',
          enum: ['INVALID_PAYLOAD_FORMAT'],
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
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
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    403: {
      description: 'Acesso negado - Permissões insuficientes',
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
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    404: {
      description: 'Tabela não encontrada',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [404] },
        cause: { type: 'string', enum: ['TABLE_NOT_FOUND'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    500: {
      description: 'Erro interno do servidor',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['BULK_UPDATE_ROWS_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
