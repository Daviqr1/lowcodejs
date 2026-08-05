import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const TableRowShowBySlugSchema: FastifySchema = {
  tags: ['Registros'],
  summary: 'Buscar registro por slug amigável',
  description:
    'Resolve um registro pelo slug amigável (sharedRowSlug) e retorna o JSON do registro. A navegação (abrir /tables/:slug/row?_id=...) fica a cargo do frontend.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['slug', 'rowSlug'],
    properties: {
      slug: {
        type: 'string',
        description: 'Slug da tabela (ex: tarefas)',
        examples: ['tarefas', 'produtos', 'blog-posts'],
      },
      rowSlug: {
        type: 'string',
        description: 'Slug amigável do registro (ex: nome-tarefa-xyz)',
        examples: ['nome-tarefa-xyz'],
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Registro encontrado',
      type: 'object',
      properties: {
        _id: { type: 'string', description: 'ID do registro' },
        status: {
          type: 'string',
          enum: ['draft', 'published'],
          description: 'Estado de rascunho (published após salvar com sucesso)',
        },
        draftAt: {
          type: 'string',
          nullable: true,
          description:
            'Quando o registro foi salvo como rascunho (null quando publicado)',
        },
        trashedAt: {
          type: 'string',
          nullable: true,
          description:
            'Quando o registro foi enviado para lixeira (null para ativos)',
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
      // Row é dinâmico — sem isto o fast-json-stringify descarta todos os campos.
      additionalProperties: true,
    },
    400: buildErrorResponse(400, 'TABLE_SLUG_FIELD_NOT_CONFIGURED', {
      description: 'Requisição inválida - Tabela não configurada para slugs',
    }),
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
    404: buildErrorResponse(404, ['TABLE_NOT_FOUND', 'ROW_NOT_FOUND'], {
      description: 'Não encontrado - Tabela ou registro não existe',
    }),
    500: buildErrorResponse(500, 'GET_ROW_BY_SLUG_ERROR', {
      description: 'Erro interno do servidor',
      message: 'Erro interno do servidor',
    }),
  },
};
