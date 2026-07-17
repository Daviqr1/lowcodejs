import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { MenuContractRepository } from '@application/repositories/menu/menu-contract.repository';

import type { MenuBulkDeletePayload } from './bulk-delete.validator';

type Response = Either<HTTPException, { deleted: number }>;

@Service()
export default class MenuBulkDeleteUseCase {
  constructor(private readonly menuRepository: MenuContractRepository) {}

  async execute(payload: MenuBulkDeletePayload): Promise<Response> {
    try {
      const trashedIds: string[] = [];
      for (const id of payload.ids) {
        const menu = await this.menuRepository.findById(id, { trashed: true });
        if (menu) trashedIds.push(menu._id);
      }

      if (trashedIds.length === 0) return right({ deleted: 0 });

      const deleted = await this.menuRepository.deleteMany(trashedIds);
      return right({ deleted });
    } catch (error) {
      console.error('[menu > bulk-delete][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'BULK_DELETE_MENUS_ERROR',
        ),
      );
    }
  }
}
