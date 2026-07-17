import type { FastifySchema } from 'fastify';

export const NotificationPaginatedSchema: FastifySchema = {
  tags: ['Notificações'],
  summary: 'Listar notificações com paginação',
  description:
    'Retorna uma lista paginada das notificações do usuário autenticado, com filtro opcional para apenas não lidas.',
  security: [{ cookieAuth: [] }],
  querystring: {
    type: 'object',
    properties: {
      page: {
        type: 'number',
        minimum: 1,
        default: 1,
        description: 'Número da página',
      },
      perPage: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        default: 20,
        description: 'Itens por página',
      },
      unreadOnly: {
        type: 'string',
        enum: ['true', 'false'],
        description: 'Filtrar apenas notificações não lidas (opcional)',
      },
    },
  },
  response: {
    200: {
      description: 'Lista paginada de notificações',
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string', description: 'ID da notificação' },
              userId: {
                type: 'string',
                description: 'ID do usuário destinatário',
              },
              type: {
                type: 'string',
                enum: [
                  'FORUM_MENTION',
                  'KANBAN_COMMENT_MENTION',
                  'ROW_MEMBER_ASSIGNED',
                  'GENERIC',
                ],
                description: 'Tipo da notificação',
              },
              title: { type: 'string', description: 'Título da notificação' },
              body: {
                type: 'string',
                nullable: true,
                description: 'Corpo da notificação',
              },
              action: {
                type: 'object',
                nullable: true,
                description: 'Ação associada à notificação',
                properties: {
                  type: { type: 'string', enum: ['route', 'url'] },
                  href: { type: 'string' },
                  label: { type: 'string', nullable: true },
                },
              },
              source: {
                type: 'object',
                nullable: true,
                description: 'Origem da notificação',
                properties: {
                  pkg: { type: 'string', nullable: true },
                  tableSlug: { type: 'string', nullable: true },
                  rowId: { type: 'string', nullable: true },
                  anchorId: { type: 'string', nullable: true },
                },
              },
              actorUserId: {
                type: 'string',
                nullable: true,
                description: 'ID do usuário que gerou a notificação',
              },
              read: { type: 'boolean', description: 'Se foi lida' },
              readAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                description: 'Data da leitura',
              },
              trashed: { type: 'boolean', description: 'Se está na lixeira' },
              trashedAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                description: 'Data de envio para lixeira',
              },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        meta: {
          type: 'object',
          description: 'Metadados da paginação',
          properties: {
            total: { type: 'number', description: 'Total de registros' },
            perPage: { type: 'number', description: 'Itens por página' },
            page: { type: 'number', description: 'Página atual' },
            lastPage: { type: 'number', description: 'Última página' },
            firstPage: { type: 'number', description: 'Primeira página' },
          },
        },
      },
    },
    401: {
      description: 'Não autorizado - Autenticação necessária',
      type: 'object',
      properties: {
        message: { type: 'string', enum: ['Não autorizado'] },
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
        message: { type: 'string', enum: ['Erro interno do servidor'] },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['LIST_NOTIFICATIONS_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
