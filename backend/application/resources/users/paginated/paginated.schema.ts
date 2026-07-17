import type { FastifySchema } from 'fastify';

export const UserPaginatedSchema: FastifySchema = {
  tags: ['Usuários'],
  summary: 'Listar usuários com paginação',
  description:
    'Retorna uma lista paginada de usuários com funcionalidade de busca opcional',
  security: [{ cookieAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      page: {
        type: 'number',
        minimum: 1,
        default: 1,
        description: 'Número da página (começa em 1)',
        examples: [1, 2, 5],
      },
      perPage: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        default: 50,
        description: 'Itens por página (máx. 100)',
        examples: [10, 25, 50, 100],
      },
      search: {
        type: 'string',
        minLength: 1,
        description:
          'Termo de busca para filtrar usuários por nome ou email (opcional)',
        examples: ['john', 'john@example.com', 'doe'],
      },
      status: {
        type: 'string',
        enum: ['ACTIVE', 'INACTIVE'],
        description: 'Filtra os usuários retornados por status (opcional)',
      },
      trashed: {
        type: 'string',
        enum: ['true', 'false'],
        description:
          'Filtra usuários pelo estado da lixeira. true = somente na lixeira, false = somente ativos (padrão).',
        examples: ['true', 'false'],
      },
      role: {
        type: 'string',
        enum: ['MASTER', 'ADMINISTRATOR', 'MANAGER', 'REGISTERED'],
        description:
          'Papel do contexto da consulta. Quando ADMINISTRATOR, o backend aplica regras de escopo de admin (oculta usuários MASTER). O JWT confirma a autorização.',
      },
      'order-name': {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Ordenar por nome',
      },
      'order-email': {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Ordenar por e-mail',
      },
      'order-group': {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Ordenar por grupo',
      },
      'order-status': {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Ordenar por status',
      },
      'order-created-at': {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Ordenar por data de criacao',
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      description: 'Lista paginada de usuários',
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
              group: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  name: { type: 'string' },
                  slug: { type: 'string' },
                },
              },
              status: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            perPage: { type: 'number' },
            page: { type: 'number' },
            lastPage: { type: 'number' },
            firstPage: { type: 'number' },
          },
        },
      },
    },
    401: {
      description: 'Não autorizado - Autenticação necessária',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [401] },
        cause: { type: 'string', enum: ['AUTHENTICATION_REQUIRED'] },
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
        cause: { type: 'string', enum: ['LIST_USER_PAGINATED_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
