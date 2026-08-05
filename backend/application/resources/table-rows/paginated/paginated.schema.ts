import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const TableRowPaginatedSchema: FastifySchema = {
  tags: ['Registros'],
  summary: 'Listar registros paginados',
  description:
    'Retorna uma lista paginada de registros de uma tabela com busca opcional e filtragem dinâmica',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['slug'],
    properties: {
      slug: {
        type: 'string',
        description: 'Slug da tabela cujos registros serão listados',
        examples: ['users', 'products', 'blog-posts'],
      },
    },
    additionalProperties: false,
  },
  querystring: {
    type: 'object',
    properties: {
      page: {
        type: 'number',
        minimum: 1,
        default: 1,
        description: 'Número da página (inicia em 1)',
        examples: [1, 2, 5],
      },
      perPage: {
        type: 'number',
        minimum: -1,
        maximum: 100,
        default: 50,
        description:
          'Quantidade de itens por página (máx. 100). Use -1 para buscar todos os registros (sem paginação).',
        examples: [10, 25, 50, 100, -1],
      },
      search: {
        type: 'string',
        minLength: 1,
        description: 'Termo de busca para filtrar registros (opcional)',
        examples: ['john', 'product', 'category'],
      },
      trashed: {
        type: 'string',
        enum: ['true', 'false'],
        default: 'false',
        description: 'Incluir registros na lixeira (opcional)',
        examples: ['true', 'false'],
      },
      public: {
        type: 'string',
        enum: ['true', 'false'],
        default: 'false',
        description: 'Filtrar apenas por visibilidade pública (opcional)',
        examples: ['true', 'false'],
      },
      excludeSelfId: {
        type: 'string',
        description:
          'Auto-relacionamento: oculta o próprio registro editado da lista de candidatos (opcional). Sem efeito quando a tabela-alvo é outra.',
      },
    },
    additionalProperties: true,
  },
  response: {
    200: {
      description: 'Lista paginada de registros da tabela',
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            description:
              'A estrutura dos dados do registro varia conforme os campos da tabela',
            additionalProperties: true,
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: {
              type: 'number',
              description: 'Total de registros',
            },
            perPage: {
              type: 'number',
              description: 'Quantidade de itens por página',
            },
            page: { type: 'number', description: 'Número da página atual' },
            lastPage: {
              type: 'number',
              description: 'Número da última página',
            },
            firstPage: {
              type: 'number',
              description: 'Número da primeira página',
            },
          },
        },
      },
    },
    401: buildErrorResponse(
      401,
      ['AUTHENTICATION_REQUIRED', 'USER_NOT_AUTHENTICATED'],
      {
        description: 'Não autorizado - Autenticação necessária',
      },
    ),
    403: buildErrorResponse(
      403,
      [
        'USER_NOT_FOUND',
        'USER_NOT_ACTIVE',
        'PERMISSIONS_NOT_FOUND',
        'INSUFFICIENT_PERMISSIONS',
        'OWNER_OR_ADMIN_REQUIRED',
        'TABLE_PRIVATE',
        'RESTRICTED_CREATE',
        'FORM_VIEW_RESTRICTED',
      ],
      {
        description:
          'Acesso negado - Permissão insuficiente ou tabela restrita',
      },
    ),
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
      examples: [
        {
          message: 'Tabela não encontrada',
          code: 404,
          cause: 'TABLE_NOT_FOUND',
        },
      ],
    },
    500: buildErrorResponse(500, 'LIST_ROW_TABLE_PAGINATED_ERROR', {
      description:
        'Erro interno do servidor - Problemas no banco ou no servidor',
    }),
  },
};
