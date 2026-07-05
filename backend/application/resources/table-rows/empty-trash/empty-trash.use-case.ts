import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

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

      const deleted = await this.rowRepository.emptyTrash(table, creatorId);

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
