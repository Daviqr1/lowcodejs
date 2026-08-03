import type { IRow, ITable } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import type { RowAccessGuardContractService } from '@application/services/row-access-guard/row-access-guard-contract.service';

/**
 * Itens de grupo sao subdocumentos da row pai — quem nao pode ler/escrever a
 * row tambem nao pode ler/escrever os itens dela. Sem estas checagens, uma row
 * escondida pelo guard em `table-rows/paginated` tinha o conteudo dos grupos
 * plenamente acessivel por `/tables/:slug/rows/:rowId/groups/:groupSlug`.
 */
export async function assertCanReadParentRow(
  rowAccessGuard: RowAccessGuardContractService,
  input: { table: ITable; row: IRow; actorUserId?: string },
): Promise<HTTPException | null> {
  const ctx = await rowAccessGuard.resolveContext(input.actorUserId);
  const canRead = await rowAccessGuard.composeReadDecision(
    input.table._id.toString(),
    input.row,
    ctx,
    input.table,
  );

  // NotFound (e nao Forbidden) para nao vazar a existencia da row.
  if (!canRead) {
    return HTTPException.NotFound('Registro não encontrado', 'ROW_NOT_FOUND');
  }

  return null;
}

export async function assertCanWriteParentRow(
  rowAccessGuard: RowAccessGuardContractService,
  input: {
    table: ITable;
    row: IRow;
    actorUserId?: string;
    operation: 'create' | 'update' | 'delete';
  },
): Promise<HTTPException | null> {
  const ctx = await rowAccessGuard.resolveContext(input.actorUserId);
  const decision = await rowAccessGuard.composeWriteDecision(
    input.table._id.toString(),
    input.row,
    ctx,
    input.table,
    null,
    input.operation,
  );

  if (decision.decision === 'deny') {
    return HTTPException.Forbidden(
      decision.reason ?? 'Acesso negado',
      'ROW_WRITE_RESTRICTED',
    );
  }

  return null;
}
