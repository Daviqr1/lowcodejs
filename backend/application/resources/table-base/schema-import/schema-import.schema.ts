import type { FastifySchema } from 'fastify';

export const SchemaImportSchema: FastifySchema = {
  tags: ['Tabelas'],
  summary: 'Importar tabelas em lote a partir de um schema YAML',
  description:
    'Cria múltiplas tabelas em uma única requisição a partir de um YAML declarativo. Cada tabela e seus campos são criados em sequência; erros são reportados individualmente sem abortar as demais. Relacionamentos cross-table dentro do mesmo schema são resolvidos em um segundo passe.',
  security: [{ cookieAuth: [] }],
  body: {
    type: 'object',
    required: ['yaml'],
    properties: {
      yaml: {
        type: 'string',
        description:
          'Conteúdo YAML descrevendo as tabelas (até 5 MB). Veja a documentação para o formato suportado.',
      },
    },
    additionalProperties: false,
  },
  response: {
    201: {
      description: 'Schema processado com sucesso (pode conter erros parciais)',
      type: 'object',
      properties: {
        created: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              slug: { type: 'string' },
              fieldCount: { type: 'number' },
            },
          },
        },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    400: {
      description: 'YAML inválido ou estrutura inconsistente',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [400] },
        cause: {
          type: 'string',
          enum: ['INVALID_YAML', 'INVALID_SCHEMA', 'OWNER_REQUIRED'],
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    401: {
      description: 'Não autenticado - Autenticação necessária',
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
          ],
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    500: {
      description: 'Erro interno',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['SCHEMA_IMPORT_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
