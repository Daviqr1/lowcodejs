import type { Either } from '@application/core/either.core';
import type { ITable } from '@application/core/entity.core';
import type HTTPException from '@application/core/exception.core';

export abstract class RelationshipDeletionContractService {
  // Aplica o onDelete de todas as definicoes que tocam `recordId` na `table`
  // (RESTRICT/SET_NULL/CASCADE direcional). Cascata reentra com guarda de ciclo.
  // Deve rodar ANTES de remover o proprio registro.
  abstract applyOnDelete(
    table: ITable,
    recordId: string,
  ): Promise<Either<HTTPException, true>>;

  // Remove definitions e links que referenciam uma tabela (delete de tabela).
  abstract cleanupTable(tableId: string): Promise<void>;
}
