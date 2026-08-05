import { E_ERROR_CODE } from '@application/core/error-code.core';
import { buildErrorResponse } from '@application/core/schema.core';

/**
 * Saida da fatia `menu`. O Fastify remove da resposta o que nao estiver
 * declarado aqui — foi assim que `extension` chegou a sumir do form de edicao e
 * o PATCH seguinte apagava o vinculo.
 *
 * O item de menu era redesenhado em `show`, `list`, `paginated`, `create` e
 * `update`.
 */

const MENU_REF = {
  type: 'object',
  nullable: true,
  properties: {
    _id: { type: 'string' },
    name: { type: 'string' },
    slug: { type: 'string' },
    type: { type: 'string' },
  },
} as const;

export const MenuResponse = {
  type: 'object',
  properties: {
    _id: { type: 'string', description: 'ID do menu' },
    name: { type: 'string', description: 'Nome do menu' },
    slug: { type: 'string', description: 'Slug do menu' },
    type: { type: 'string', description: 'Tipo do menu' },
    parent: { ...MENU_REF, description: 'Menu pai' },
    table: {
      type: 'object',
      nullable: true,
      description: 'Tabela associada',
      properties: {
        _id: { type: 'string' },
        name: { type: 'string' },
        slug: { type: 'string' },
      },
    },
    owner: {
      type: 'object',
      nullable: true,
      description: 'Criador do menu',
      properties: {
        _id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' },
      },
    },
    html: { type: 'string', nullable: true, description: 'Conteúdo HTML' },
    url: { type: 'string', nullable: true, description: 'URL' },
    order: { type: 'number', description: 'Ordem do menu' },
    isInitial: { type: 'boolean' },
    icon: {
      type: 'string',
      nullable: true,
      description: 'URL da imagem usada como ícone',
    },
    extension: {
      type: 'object',
      nullable: true,
      description: 'Referência a um módulo de extensão',
      properties: {
        pkg: { type: 'string' },
        extensionId: { type: 'string' },
      },
    },
    visibility: {
      type: 'object',
      nullable: true,
      description: 'Visibilidade da opção de menu (Grupo|Public|Nobody)',
      properties: {
        kind: { type: 'string', enum: ['PUBLIC', 'NOBODY', 'GROUP'] },
        group: { type: 'string', nullable: true },
      },
    },
    trashed: { type: 'boolean' },
    trashedAt: { type: 'string', format: 'date-time', nullable: true },
    children: {
      type: 'array',
      description: 'Itens de menu filhos ativos',
      items: MENU_REF,
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

export const MenuListResponse = {
  description: 'Lista de itens de menu',
  type: 'array',
  items: MenuResponse,
} as const;

export const MenuPaginatedResponse = {
  description: 'Lista paginada de itens de menu',
  type: 'object',
  properties: {
    data: { type: 'array', items: MenuResponse },
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

export const MenuNotFoundResponse = buildErrorResponse(
  404,
  E_ERROR_CODE.MENU_NOT_FOUND,
  { description: 'Menu não encontrado' },
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
