/* eslint-disable no-unused-vars */
/**
 * Row Access Guard — Contract v2
 *
 * INVARIANTES (não mude sem coordenar com RowAccessGuardService):
 *
 * 1. ADMIN BYPASS GLOBAL: MASTER e ADMINISTRATOR pulam TODOS os guards.
 *    Decisão tomada no service (bypassAdmin). Implementadores de guard podem
 *    assumir que user?.role NUNCA será MASTER ou ADMINISTRATOR aqui.
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

// Legacy types kept for backward compat (deprecated — use GuardWriteDecision)
export type GuardOperation = 'create' | 'update' | 'delete';
export type GuardWriteCheck =
  | { allowed: true }
  | { allowed: false; reason: string };

export interface RowAccessGuard {
  /** ex: "core:row-access" */
  pluginKey: string;

  /** Defines composition semantics: restrictive = AND/deny, permissive = OR/allow */
  category: GuardCategory;

  /** If false, mode="all" do tableScope é proibido para este plugin. */
  supportsScopeAll: boolean;

  /** Zod schema opcional. Service rejeita bind se settings inválidos. */
  settingsSchema?: z.ZodTypeAny;

  /**
   * Default settings opcional. Quando presente, `configure-table-scope`
   * passa esses defaults para `onTableBound` ao invés de `{}` —
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
   * Retornar `{}` significa "nada a contribuir" (filtrado em permissive pra evitar match-all).
   */
  adjustListQuery(
    query: Record<string, unknown>,
    user: IJWTPayload | undefined,
    table: ITable,
    settings: Record<string, unknown>,
  ): Record<string, unknown>;

  /** Decide se user pode ler uma row específica. Tri-state. */
  canRead(
    row: IRow,
    user: IJWTPayload | undefined,
    table: ITable,
    settings: Record<string, unknown>,
  ): GuardAccessDecision;

  /** Decide se user pode escrever (create/update/delete). Tri-state. */
  canWrite(
    row: IRow | null,
    user: IJWTPayload | undefined,
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
    user: IJWTPayload | undefined,
    table: ITable,
    operation: 'create' | 'update',
    currentRow: IRow | null,
    settings: Record<string, unknown>,
  ): Record<string, unknown>;
}
