/* eslint-disable no-unused-vars */
import type { Either } from '@application/core/either.core';
import type { IRow, ITable, IUser } from '@application/core/entity.core';
import type HTTPException from '@application/core/exception.core';

export type GuardOperation = 'create' | 'update' | 'delete';

export type GuardWriteCheck =
  | { allowed: true }
  | { allowed: false; reason: string };

export type GuardBindResult = { wasCreated: boolean };

export abstract class RowAccessGuard {
  /** ex: "core:visibility-by-role" */
  abstract pluginKey: string;

  /** Se false, mode="all" do tableScope é proibido para este plugin. */
  abstract supportsScopeAll: boolean;

  /** Roda quando o plugin é vinculado a uma tabela. Pode falhar (Either.left). */
  abstract onTableBound(
    table: ITable,
  ): Promise<Either<HTTPException, GuardBindResult>>;

  /** Roda quando o plugin é desvinculado. Opcional. */
  onTableUnbound?(table: ITable): Promise<void>;

  /** Modifica a query mongo de listagem (paginated). */
  abstract adjustListQuery(
    query: Record<string, unknown>,
    user: IUser | undefined,
    table: ITable,
  ): Record<string, unknown>;

  /** Decide se user pode ler uma row específica. */
  abstract canRead(row: IRow, user: IUser | undefined, table: ITable): boolean;

  /** Decide se user pode escrever (create/update/delete). */
  abstract canWrite(
    row: IRow | null,
    user: IUser | undefined,
    table: ITable,
    payload: Record<string, unknown> | null,
    operation: GuardOperation,
  ): GuardWriteCheck;

  /** Ajusta o payload antes de salvar (força PUBLIC pra não-admin). */
  abstract sanitizeWritePayload(
    payload: Record<string, unknown>,
    user: IUser | undefined,
    table: ITable,
    operation: 'create' | 'update',
    currentRow: IRow | null,
  ): Record<string, unknown>;
}
