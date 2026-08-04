import type { IRow, ITable } from '@application/core/entity.core';
import type HTTPException from '@application/core/exception.core';
import type {
  GuardEvalContext,
  GuardWriteDecision,
} from '@application/core/row-access-guard.contract';

/**
 * Contrato do serviço que compõe os row-access guards ativos numa tabela.
 * Os use-cases de row (create/update/delete/paginated/show/bulk-*) injetam este
 * contrato; o di-registry resolve para a implementação Mongoose, e os testes
 * usam a in-memory permissiva.
 */
export type RowWriteOperation = 'create' | 'update' | 'delete';

export abstract class RowAccessGuardContractService {
  /**
   * Mantem so os ids cuja row o ator pode escrever. Rows negadas somem em
   * silencio — mesmo comportamento do `__ownOnly`. Privilegiado bypassa.
   */
  abstract filterWritableIds(input: {
    table: ITable;
    ids: string[];
    actorUserId?: string;
    operation: RowWriteOperation;
  }): Promise<string[]>;

  /**
   * Item de grupo e subdocumento da row pai: quem nao le a row nao le os
   * itens. Sem isso, uma row escondida pelo guard na listagem tinha o
   * conteudo dos grupos acessivel por `/rows/:rowId/groups/:groupSlug`.
   * Devolve NotFound (nao Forbidden) para nao vazar a existencia da row.
   */
  abstract assertCanReadParentRow(input: {
    table: ITable;
    row: IRow;
    actorUserId?: string;
  }): Promise<HTTPException | null>;

  abstract assertCanWriteParentRow(input: {
    table: ITable;
    row: IRow;
    actorUserId?: string;
    operation: RowWriteOperation;
  }): Promise<HTTPException | null>;

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
