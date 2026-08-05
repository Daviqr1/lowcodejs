import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { MenuContractRepository } from '@application/repositories/menu/menu-contract.repository';
import { TrashContractService } from '@application/services/trash/trash-contract.service';

import type { MenuBulkTrashPayload } from '../_shared.validator';

type Response = Either<HTTPException, { modified: number }>;

@Service()
export default class MenuBulkTrashUseCase {
  constructor(
    private readonly menuRepository: MenuContractRepository,
    private readonly trash: TrashContractService,
  ) {}

  async execute(payload: MenuBulkTrashPayload): Promise<Response> {
    try {
      const allIds = new Set<string>(payload.ids);

      for (const id of payload.ids) {
        const descendants = await this.menuRepository.findDescendantIds(id);
        for (const descendantId of descendants) {
          allIds.add(descendantId);
        }
      }

      const modified = await this.trash.bulkTrash(
        this.menuRepository,
        Array.from(allIds),
      );

      return right({ modified });
    } catch (error) {
      console.error('[menu > bulk-trash][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'BULK_TRASH_MENUS_ERROR',
        ),
      );
    }
  }
}
