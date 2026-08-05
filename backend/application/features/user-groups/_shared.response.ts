import { E_ERROR_CODE } from '@application/core/error-code.core';
import { buildErrorResponse } from '@application/core/schema.core';

/**
 * Saida da fatia `user-groups`. O Fastify remove da resposta o que nao estiver
 * declarado aqui, entao estes blocos definem o que vai no ar.
 *
 * O grupo era redesenhado em `show`, `list`, `paginated`, `create` e `update`.
 */

const PERMISSION = {
  type: 'object',
  properties: {
    _id: { type: 'string', description: 'ID da permissão' },
    name: { type: 'string', description: 'Nome da permissão' },
    slug: { type: 'string', description: 'Slug da permissão' },
    description: { type: 'string', description: 'Descrição da permissão' },
  },
} as const;

export const UserGroupResponse = {
  type: 'object',
  properties: {
    _id: { type: 'string', description: 'ID do grupo' },
    name: { type: 'string', description: 'Nome do grupo' },
    slug: { type: 'string', description: 'Identificador único do grupo' },
    description: { type: 'string', description: 'Descrição do grupo' },
    permissions: {
      type: 'array',
      description: 'Permissões atribuídas ao grupo',
      items: PERMISSION,
    },
    encompasses: {
      type: 'array',
      description: 'IDs dos grupos englobados',
      items: { type: 'string' },
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

export const UserGroupListResponse = {
  description: 'Lista completa de grupos de usuários',
  type: 'array',
  items: UserGroupResponse,
} as const;

export const UserGroupPaginatedResponse = {
  description: 'Lista paginada de grupos de usuários',
  type: 'object',
  properties: {
    data: { type: 'array', items: UserGroupResponse },
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

export const affectedCountResponse = (
  key: 'modified' | 'deleted',
  description: string,
): Record<string, unknown> => ({
  description,
  type: 'object',
  properties: { [key]: { type: 'number', description } },
});

export const emptyResponse = (
  description: string,
): Record<string, unknown> => ({ type: 'null', description });

// ── Erros ─────────────────────────────────────────────────────────────

export const UnauthorizedResponse = buildErrorResponse(
  401,
  E_ERROR_CODE.AUTHENTICATION_REQUIRED,
  { description: 'Não autorizado - Autenticação necessária' },
);

export const ForbiddenResponse = buildErrorResponse(
  403,
  E_ERROR_CODE.FORBIDDEN,
  { description: 'Proibido - Permissão insuficiente' },
);

export const UserGroupNotFoundResponse = buildErrorResponse(
  404,
  E_ERROR_CODE.USER_GROUP_NOT_FOUND,
  { description: 'Grupo não encontrado' },
);

export const InvalidPayloadResponse = buildErrorResponse(
  400,
  [E_ERROR_CODE.INVALID_PAYLOAD_FORMAT, E_ERROR_CODE.INVALID_PARAMETERS],
  {
    description: 'Requisição inválida - Falha na validação',
    errorsDescription: 'Erros de validação por campo',
  },
);

export const serverErrorResponse = (
  cause: string,
): ReturnType<typeof buildErrorResponse> =>
  buildErrorResponse(500, cause, { description: 'Erro interno do servidor' });
