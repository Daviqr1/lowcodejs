import type { ITable } from '@application/core/entity.core';
import type { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import type { RowAccessGuardContractService } from '@application/services/row-access-guard/row-access-guard-contract.service';

type Operation = 'create' | 'update' | 'delete';

/**
 * Mantem apenas os ids cuja row o ator pode escrever segundo os guards ativos.
 *
 * Rows negadas sao descartadas em silencio — mesmo comportamento do `__ownOnly`,
 * que ja filtra sem avisar. Usuario privilegiado bypassa (o proprio service
 * decide isso em `resolveContext`), entao devolvemos os ids intactos.
 */
export async function filterWritableIds(
  deps: {
    rowRepository: RowContractRepository;
    rowAccessGuard: RowAccessGuardContractService;
  },
  input: {
    table: ITable;
    ids: string[];
    actorUserId?: string;
    operation: Operation;
  },
): Promise<string[]> {
  const ctx = await deps.rowAccessGuard.resolveContext(input.actorUserId);
  if (ctx.isPrivileged) return input.ids;

  const tableId = input.table._id.toString();

  const checked = await Promise.all(
    input.ids.map(async (_id) => {
      const row = await deps.rowRepository.findOne({
        table: input.table,
        query: { _id },
      });
      if (!row) return null;

      const decision = await deps.rowAccessGuard.composeWriteDecision(
        tableId,
        row,
        ctx,
        input.table,
        null,
        input.operation,
      );
      if (decision.decision === 'deny') return null;

      return _id;
    }),
  );

  return checked.filter((id): id is string => id !== null);
}
