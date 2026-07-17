/**
 * Row Access Guard — Contract v3 (group-keyed)
 *
 * INVARIANTES (não mude sem coordenar com RowAccessGuardService):
 *
 * 1. PRIVILEGIADO BYPASS GLOBAL: usuários privilegiados (fecho de grupos contém
 *    MASTER ou ADMINISTRATOR) pulam TODOS os guards. Decisão tomada no service
 *    via `ctx.isPrivileged`. Implementadores de guard podem assumir que
 *    `ctx.isPrivileged` NUNCA será true aqui.
 *
 * 2. CATEGORIA:
 *    - 'restrictive': adiciona AND nas queries, pode emitir 'deny'
 *    - 'permissive':  adiciona OR (bypass), pode emitir 'allow'
 *
 * 3. canRead/canWrite — semântica de composição:
 *    allow > deny > abstain (default-permitir se só abstain).
 *
 * 4. adjustListQuery retorna FRAGMENTO ({} = "nada a contribuir").
 *    Service compõe via $and (restrictive) e $or (permissive).
 *
 * 5. sanitizeWritePayload SÓ é chamado para guards restrictive.
 *    Permissive devem retornar payload identity se chamados.
 *
 * 6. TODOS os métodos síncronos recebem `ctx: GuardEvalContext` — o caller
 *    (use-case) já resolveu grupos e privilégio antes de chamar o service.
 *    Guards NÃO resolvem grupos internamente.
 */
import type { z } from 'zod';

import type { Either } from '@application/core/either.core';
import type { IJWTPayload, IRow, ITable } from '@application/core/entity.core';
import type HTTPException from '@application/core/exception.core';

export type GuardAccessDecision = 'allow' | 'deny' | 'abstain';

export type GuardWriteDecision =
  | { decision: 'allow' }
  | { decision: 'deny'; reason: string }
  | { decision: 'abstain' };

export type GuardCategory = 'restrictive' | 'permissive';

export type GuardBindResult = { wasCreated: boolean };

/**
 * Contexto de avaliação do guard. Construído pelo use-case antes de chamar o
 * RowAccessGuardService — o service passa o ctx diretamente para cada guard.
 *
 * - `user`: payload JWT cru (pode ser undefined para visitantes/unauthenticated).
 * - `userId`: atalho para `user?.sub` (string ou undefined).
 * - `groupIds`: fecho transitivo de todos os grupos do usuário, resolvido pelo
 *   GroupResolverContractService. Vazio para visitantes.
 * - `isPrivileged`: true se algum grupo do fecho tem slug MASTER ou ADMINISTRATOR.
 *   Quando true, o service aplica bypass global antes de consultar guards.
 */
export type GuardEvalContext = {
  user: IJWTPayload | undefined;
  userId: string | undefined;
  groupIds: Set<string>;
  isPrivileged: boolean;
};

export type RowAccessGuard = {
  /** ex: "core:row-access" */
  pluginKey: string;

  /** Define composition semantics: restrictive = AND/deny, permissive = OR/allow */
  category: GuardCategory;

  /** Se false, mode="all" do tableScope é proibido para este plugin. */
  supportsScopeAll: boolean;

  /** Zod schema opcional. Service rejeita bind se settings inválidos. */
  settingsSchema?: z.ZodTypeAny;

  /**
   * Default settings opcional. Quando presente, configure-table-scope
   * passa esses defaults para onTableBound ao invés de {} —
   * evita Zod errors em guards que exigem settings.
   */
  defaultSettings?: Record<string, unknown>;

  /** Roda quando o plugin é vinculado a uma tabela. Pode falhar (Either.left). */
  onTableBound(
    table: ITable,
    settings: Record<string, unknown>,
  ): Promise<Either<HTTPException, GuardBindResult>>;

  /** Roda quando o plugin é desvinculado. Opcional. */
  onTableUnbound?(
    table: ITable,
    settings: Record<string, unknown>,
  ): Promise<void>;

  /**
   * Retorna FRAGMENTO de query Mongo. Service compõe.
   * Retornar {} significa "nada a contribuir" (filtrado em permissive pra evitar match-all).
   */
  adjustListQuery(
    query: Record<string, unknown>,
    ctx: GuardEvalContext,
    table: ITable,
    settings: Record<string, unknown>,
  ): Record<string, unknown>;

  /** Decide se user pode ler uma row específica. Tri-state. */
  canRead(
    row: IRow,
    ctx: GuardEvalContext,
    table: ITable,
    settings: Record<string, unknown>,
  ): GuardAccessDecision;

  /** Decide se user pode escrever (create/update/delete). Tri-state. */
  canWrite(
    row: IRow | null,
    ctx: GuardEvalContext,
    table: ITable,
    payload: Record<string, unknown> | null,
    operation: 'create' | 'update' | 'delete',
    settings: Record<string, unknown>,
  ): GuardWriteDecision;

  /**
   * Ajusta o payload antes de salvar.
   * Só restrictive sanitizam. Permissive devem retornar payload identity se chamados.
   */
  sanitizeWritePayload(
    payload: Record<string, unknown>,
    ctx: GuardEvalContext,
    table: ITable,
    operation: 'create' | 'update',
    currentRow: IRow | null,
    settings: Record<string, unknown>,
  ): Record<string, unknown>;
};
