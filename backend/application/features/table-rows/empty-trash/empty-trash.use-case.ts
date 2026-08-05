import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { RowAccessGuardContractService } from '@application/services/row-access-guard/row-access-guard-contract.service';

type Payload = {
  slug: string;
  __actorUserId?: string;
  // Convidado contributor: só esvazia da lixeira os próprios registros.
  __ownOnly?: boolean;
};
type Response = Either<HTTPException, { deleted: number }>;

@Service()
export default class EmptyTrashUseCase {
  constructor(
    private readonly tableRepository: TableContractRepository,
    private readonly rowRepository: RowContractRepository,
    private readonly rowAccessGuard: RowAccessGuardContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const table = await this.tableRepository.findBySlug(payload.slug);

      if (!table) {
        return left(
          HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND'),
        );
      }

      let creatorId: string | undefined = undefined;
      if (payload.__ownOnly) creatorId = payload.__actorUserId;

      const ctx = await this.rowAccessGuard.resolveContext(
        payload.__actorUserId,
      );
      const guardQuery = await this.rowAccessGuard.composeListQuery(
        table._id.toString(),
        {},
        ctx,
        table,
      );

      // Sem guard ativo (ou privilegiado) mantem o deleteMany direto, que e bem
      // mais barato do que enumerar a lixeira inteira.
      if (Object.keys(guardQuery).length === 0) {
        const deleted = await this.rowRepository.emptyTrash(table, creatorId);
        return right({ deleted });
      }

      const trashed = await this.rowRepository.findMany({
        table,
        rawFilters: { trashed: 'true' },
        guardQuery,
        skip: 0,
        // 0 = sem limite no Mongoose.
        limit: 0,
      });

      const ids = trashed.map((row) => row._id.toString());
      if (ids.length === 0) return right({ deleted: 0 });

      const deleted = await this.rowRepository.bulkDelete({
        table,
        ids,
        ...(creatorId && { creatorId }),
      });

      return right({ deleted });
    } catch (error) {
      console.error('[table-rows > empty-trash][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'EMPTY_TRASH_ROWS_ERROR',
        ),
      );
    }
  }
}
