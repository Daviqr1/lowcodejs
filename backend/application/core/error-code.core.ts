/**
 * Codigos de erro que cruzam mais de uma fatia — o `cause` das respostas.
 *
 * Cada um estava escrito como literal em todo lugar que o produzia e em todo
 * `*.schema.ts` que o documentava: `TABLE_NOT_FOUND` aparece em 102 arquivos.
 * Um erro de digitacao em qualquer copia so aparece no cliente, que casa pelo
 * `cause` para decidir a mensagem.
 *
 * **Nao entra aqui** o codigo de uma operacao so — os `*_ERROR` do `catch` de
 * cada use-case, por exemplo. Esses vivem na propria fatia; catalogar cada um
 * daria uma lista de 200 entradas com um consumidor cada.
 *
 * O valor e a string que vai no ar. Onde ele estava inconsistente, mantive o
 * valor e corrigi so o nome da chave — mudar o valor quebraria o frontend.
 */
export const E_ERROR_CODE = {
  // ── Sessao e autorizacao ────────────────────────────────────────────
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
  SESSION_REVOKED: 'SESSION_REVOKED',
  USER_INACTIVE: 'USER_INACTIVE',
  /** O que o `PermissionMiddleware` emite; o default do HTTPException difere. */
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  OWNER_OR_ADMIN_REQUIRED: 'OWNER_OR_ADMIN_REQUIRED',
  OWNER_REQUIRED: 'OWNER_REQUIRED',

  // ── Entrada ─────────────────────────────────────────────────────────
  INVALID_PAYLOAD_FORMAT: 'INVALID_PAYLOAD_FORMAT',
  INVALID_PARAMETERS: 'INVALID_PARAMETERS',
  INVALID_TABLE_SLUG: 'INVALID_TABLE_SLUG',
  INVALID_FIELD_SLUG: 'INVALID_FIELD_SLUG',
  INVALID_FIELD_TYPE: 'INVALID_FIELD_TYPE',

  // ── Nao encontrado ──────────────────────────────────────────────────
  ITEM_NOT_FOUND: 'ITEM_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_GROUP_NOT_FOUND: 'USER_GROUP_NOT_FOUND',
  GROUP_NOT_FOUND: 'GROUP_NOT_FOUND',
  PERMISSIONS_NOT_FOUND: 'PERMISSIONS_NOT_FOUND',
  TABLE_NOT_FOUND: 'TABLE_NOT_FOUND',
  SOURCE_TABLE_NOT_FOUND: 'SOURCE_TABLE_NOT_FOUND',
  FIELD_NOT_FOUND: 'FIELD_NOT_FOUND',
  ROW_NOT_FOUND: 'ROW_NOT_FOUND',
  MENU_NOT_FOUND: 'MENU_NOT_FOUND',
  PARENT_MENU_NOT_FOUND: 'PARENT_MENU_NOT_FOUND',
  RELATIONSHIP_NOT_FOUND: 'RELATIONSHIP_NOT_FOUND',
  NOTIFICATION_NOT_FOUND: 'NOTIFICATION_NOT_FOUND',
  EXTENSION_NOT_FOUND: 'EXTENSION_NOT_FOUND',
  VALIDATION_TOKEN_NOT_FOUND: 'VALIDATION_TOKEN_NOT_FOUND',

  // ── Conflito ────────────────────────────────────────────────────────
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  TABLE_ALREADY_EXISTS: 'TABLE_ALREADY_EXISTS',
  MENU_ALREADY_EXISTS: 'MENU_ALREADY_EXISTS',
  DROPDOWN_OPTION_ALREADY_EXISTS: 'DROPDOWN_OPTION_ALREADY_EXISTS',
  /** Valor no singular por historico; renomear quebraria o frontend. */
  FIELD_ALREADY_EXISTS: 'FIELD_ALREADY_EXIST',
  ALREADY_TRASHED: 'ALREADY_TRASHED',
  NOT_TRASHED: 'NOT_TRASHED',
  NATIVE_FIELD_CANNOT_BE_TRASHED: 'NATIVE_FIELD_CANNOT_BE_TRASHED',
  VALIDATION_TOKEN_EXPIRED: 'VALIDATION_TOKEN_EXPIRED',
  VALIDATION_TOKEN_ALREADY_USED: 'VALIDATION_TOKEN_ALREADY_USED',
  SETUP_ALREADY_COMPLETED: 'SETUP_ALREADY_COMPLETED',
  MIGRATION_ALREADY_RUNNING: 'MIGRATION_ALREADY_RUNNING',
  TABLE_REQUIRED: 'TABLE_REQUIRED',

  // ── Falha interna ───────────────────────────────────────────────────
  SERVER_ERROR: 'SERVER_ERROR',
  SETTINGS_READ_ERROR: 'SETTINGS_READ_ERROR',
} as const;
