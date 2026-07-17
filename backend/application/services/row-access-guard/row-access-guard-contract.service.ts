import type { IRow, ITable } from '@application/core/entity.core';
import type {
  GuardEvalContext,
  GuardWriteDecision,
} from '@application/core/extensions/row-access-guard.contract';

/**
 * Contrato do serviço que compõe os row-access guards ativos numa tabela.
 * Os use-cases de row (create/update/delete/paginated/show/bulk-*) injetam este
 * contrato; o di-registry resolve para a implementação Mongoose, e os testes
 * usam a in-memory permissiva.
 */
export abstract class RowAccessGuardContractService {
  abstract resolveContext(
    userId: string | undefined,
  ): Promise<GuardEvalContext>;

  abstract composeListQuery(
    tableId: string,
    baseQuery: Record<string, unknown>,
    ctx: GuardEvalContext,
    table: ITable,
  ): Promise<Record<string, unknown>>;

  abstract composeReadDecision(
    tableId: string,
    row: IRow,
    ctx: GuardEvalContext,
    table: ITable,
  ): Promise<boolean>;

  abstract composeWriteDecision(
    tableId: string,
    row: IRow | null,
    ctx: GuardEvalContext,
    table: ITable,
    payload: Record<string, unknown> | null,
    operation: 'create' | 'update' | 'delete',
  ): Promise<GuardWriteDecision>;

  abstract composeSanitize(
    tableId: string,
    payload: Record<string, unknown>,
    ctx: GuardEvalContext,
    table: ITable,
    operation: 'create' | 'update',
    currentRow: IRow | null,
  ): Promise<Record<string, unknown>>;
}
