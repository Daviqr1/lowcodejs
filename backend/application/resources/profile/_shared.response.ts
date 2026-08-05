import { buildErrorResponse } from '@application/core/schema.core';

/**
 * Saida da fatia `profile`. O Fastify remove da resposta o que nao estiver
 * declarado aqui.
 *
 * O grupo estava desenhado duas vezes e divergia: `show` trazia `encompasses`
 * e `update` nao. Agora e uma forma so.
 */

const PERMISSION = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    name: { type: 'string' },
    slug: { type: 'string' },
    description: { type: 'string', nullable: true },
  },
} as const;

const GROUP = {
  type: 'object',
  description: 'Grupo do usuário com permissões populadas',
  properties: {
    _id: { type: 'string' },
    name: { type: 'string' },
    slug: { type: 'string' },
    description: { type: 'string', nullable: true },
    permissions: { type: 'array', items: PERMISSION },
    encompasses: {
      type: 'array',
      description: 'IDs dos grupos englobados',
      items: { type: 'string' },
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

const PROFILE_BASE = {
  _id: { type: 'string', description: 'ID do usuário' },
  name: { type: 'string', description: 'Nome completo do usuário' },
  email: { type: 'string', format: 'email' },
  status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
  group: GROUP,
  createdAt: { type: 'string', format: 'date-time' },
  updatedAt: { type: 'string', format: 'date-time' },
} as const;

/** O `show` acrescenta o que a navegacao do frontend precisa. */
export const ProfileShowResponse = {
  description: 'Perfil do usuário recuperado com sucesso',
  type: 'object',
  properties: {
    ...PROFILE_BASE,
    capabilities: {
      type: 'array',
      description:
        'Capacidades de área resolvidas pelo fecho de grupos (slugs de permissão); usado pelo frontend para liberar a navegação por capability',
      items: { type: 'string' },
    },
    groups: {
      type: 'array',
      description: 'Grupos adicionais do usuário (multi-grupo)',
      items: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          permissions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                slug: { type: 'string' },
              },
            },
          },
        },
      },
    },
    notificationsEnabled: { type: 'boolean' },
  },
} as const;

export const ProfileUpdateResponse = {
  description: 'Perfil atualizado com sucesso',
  type: 'object',
  properties: { ...PROFILE_BASE, notificationsEnabled: { type: 'boolean' } },
} as const;

export const UnauthorizedResponse = buildErrorResponse(
  401,
  ['AUTHENTICATION_REQUIRED', 'INVALID_CREDENTIALS'],
  {
    description: 'Não autorizado - Autenticação necessária ou senha incorreta',
  },
);

export const UserNotFoundResponse = buildErrorResponse(404, 'USER_NOT_FOUND', {
  description: 'Usuário do token não encontrado',
});

export const InvalidPayloadResponse = buildErrorResponse(
  400,
  'INVALID_PAYLOAD_FORMAT',
  {
    description: 'Requisição inválida - Falha na validação',
    errorsDescription: 'Erros de validação por campo',
  },
);

export const serverErrorResponse = (
  cause: string,
): ReturnType<typeof buildErrorResponse> =>
  buildErrorResponse(500, cause, { description: 'Erro interno do servidor' });
