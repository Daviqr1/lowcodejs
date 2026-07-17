import type { FastifySchema } from 'fastify';

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
    400: {
      description: 'Requisição inválida - Tabela não configurada para slugs',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [400] },
        cause: {
          type: 'string',
          enum: ['TABLE_SLUG_FIELD_NOT_CONFIGURED'],
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
      description: 'Acesso negado - Permissão insuficiente ou tabela restrita',
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
      description: 'Não encontrado - Tabela ou registro não existe',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [404] },
        cause: {
          type: 'string',
          enum: ['TABLE_NOT_FOUND', 'ROW_NOT_FOUND'],
        },
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
        message: { type: 'string', enum: ['Erro interno do servidor'] },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['GET_ROW_BY_SLUG_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
