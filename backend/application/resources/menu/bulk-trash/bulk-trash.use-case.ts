import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { MenuContractRepository } from '@application/repositories/menu/menu-contract.repository';

import type { MenuBulkTrashPayload } from './bulk-trash.validator';

type Response = Either<HTTPException, { modified: number }>;

@Service()
export default class MenuBulkTrashUseCase {
  constructor(private readonly menuRepository: MenuContractRepository) {}

  async execute(payload: MenuBulkTrashPayload): Promise<Response> {
    try {
      const allIds = new Set<string>(payload.ids);

      for (const id of payload.ids) {
        const descendants = await this.menuRepository.findDescendantIds(id);
        for (const descendantId of descendants) {
          allIds.add(descendantId);
        }
      }

      const modified = await this.menuRepository.updateMany({
        _ids: Array.from(allIds),
        filterTrashed: false,
        data: {
          trashed: true,
          trashedAt: new Date(),
        },
      });

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
