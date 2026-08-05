import { buildErrorResponse } from '@application/core/schema.core';

/**
 * Saida da fatia `users` para o contrato OpenAPI.
 *
 * O Fastify **remove da resposta** o que nao estiver declarado aqui, entao
 * estes blocos nao sao so documentacao: definem o que vai no ar.
 *
 * Antes cada operacao redesenhava o mesmo usuario e divergia — `create`
 * devolvia `group.permissions`, `show` devolvia `group.description` e `update`
 * nenhum dos dois. Agora ha duas formas, e a diferenca entre elas e
 * deliberada: o detalhe traz o grupo inteiro, a listagem traz so a referencia.
 */

const TIMESTAMPS = {
  createdAt: { type: 'string', format: 'date-time' },
  updatedAt: { type: 'string', format: 'date-time' },
} as const;

const PERMISSION_REF = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    name: { type: 'string' },
    slug: { type: 'string' },
    description: { type: 'string' },
  },
} as const;

/** Grupo na listagem: so o suficiente para rotular a linha. */
const GROUP_REF = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    name: { type: 'string' },
    slug: { type: 'string' },
  },
} as const;

/** Grupo no detalhe: inclui as permissoes que a tela de edicao usa. */
const GROUP_FULL = {
  type: 'object',
  description: 'Grupo do usuário (populado)',
  properties: {
    _id: { type: 'string' },
    name: { type: 'string' },
    slug: { type: 'string' },
    description: { type: 'string' },
    permissions: { type: 'array', items: PERMISSION_REF },
  },
} as const;

/** Usuario no detalhe. Nunca traz `password` — ver `UserMapperService`. */
export const UserDetailResponse = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    group: GROUP_FULL,
    status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
    ...TIMESTAMPS,
  },
} as const;

const USER_LIST_ITEM = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string' },
    group: GROUP_REF,
    status: { type: 'string' },
    ...TIMESTAMPS,
  },
} as const;

export const UserPaginatedResponse = {
  description: 'Lista paginada de usuários',
  type: 'object',
  properties: {
    data: { type: 'array', items: USER_LIST_ITEM },
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

/** Resposta das operacoes em massa: quantos registros foram afetados. */
export const affectedCountResponse = (
  key: 'modified' | 'deleted',
  description: string,
): Record<string, unknown> => ({
  description,
  type: 'object',
  properties: {
    [key]: { type: 'number', description },
  },
});

/** Operacao sem corpo de resposta. */
export const emptyResponse = (
  description: string,
): Record<string, unknown> => ({
  type: 'null',
  description,
});

// ── Erros ─────────────────────────────────────────────────────────────
// Antes metade destes blocos era escrita a mao e a outra metade vinha do
// `buildErrorResponse`, com `description` diferente para o mesmo status.

export const UnauthorizedResponse = buildErrorResponse(
  401,
  'AUTHENTICATION_REQUIRED',
  {
    description: 'Não autorizado - Autenticação necessária',
    message: 'Autenticação necessária',
  },
);

/** `PermissionMiddleware` emite `FORBIDDEN`, nao o default do HTTPException. */
export const ForbiddenResponse = buildErrorResponse(403, 'FORBIDDEN', {
  description: 'Proibido - Permissão insuficiente',
});

export const UserNotFoundResponse = buildErrorResponse(404, 'USER_NOT_FOUND', {
  description: 'Usuário não encontrado',
});

export const InvalidPayloadResponse = buildErrorResponse(
  400,
  ['INVALID_PAYLOAD_FORMAT', 'INVALID_PARAMETERS'],
  {
    description: 'Requisição inválida - Falha na validação',
    errorsDescription: 'Erros de validação por campo',
  },
);

export const serverErrorResponse = (
  cause: string,
): ReturnType<typeof buildErrorResponse> =>
  buildErrorResponse(500, cause, { description: 'Erro interno do servidor' });
