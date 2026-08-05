import { buildErrorResponse } from '@application/core/schema.core';

/**
 * Saida da fatia `notifications`. O Fastify remove da resposta o que nao
 * estiver declarado aqui, entao estes blocos definem o que vai no ar.
 *
 * A notificacao estava redesenhada por inteiro em `paginated` e em
 * `mark-as-read` — 55 linhas identicas em dois lugares.
 */

export const NotificationResponse = {
  type: 'object',
  properties: {
    _id: { type: 'string', description: 'ID da notificação' },
    userId: { type: 'string', description: 'ID do usuário destinatário' },
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
    body: { type: 'string', nullable: true },
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
    actorUserId: { type: 'string', nullable: true },
    read: { type: 'boolean', description: 'Se foi lida' },
    readAt: { type: 'string', format: 'date-time', nullable: true },
    trashed: { type: 'boolean' },
    trashedAt: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

export const NotificationPaginatedResponse = {
  description: 'Lista paginada de notificações',
  type: 'object',
  properties: {
    data: { type: 'array', items: NotificationResponse },
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
} as const;

export const UnauthorizedResponse = buildErrorResponse(
  401,
  'AUTHENTICATION_REQUIRED',
  { description: 'Não autorizado - Autenticação necessária' },
);

export const NotificationNotFoundResponse = buildErrorResponse(
  404,
  'NOTIFICATION_NOT_FOUND',
  { description: 'Notificação não encontrada' },
);

export const serverErrorResponse = (
  cause: string,
): ReturnType<typeof buildErrorResponse> =>
  buildErrorResponse(500, cause, { description: 'Erro interno do servidor' });
