import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { MenuContractRepository } from '@application/repositories/menu/menu-contract.repository';

import type { MenuRemoveFromTrashPayload } from '../_shared.validator';

type Response = Either<HTTPException, null>;
type Payload = MenuRemoveFromTrashPayload;

@Service()
export default class MenuRemoveFromTrashUseCase {
  constructor(private readonly menuRepository: MenuContractRepository) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const menu = await this.menuRepository.findById(payload._id, {
        trashed: true,
      });

      if (!menu)
        return left(
          HTTPException.NotFound('Menu não encontrado', 'MENU_NOT_FOUND'),
        );

      if (!menu.trashed)
        return left(
          HTTPException.Conflict('Menu não está na lixeira', 'NOT_TRASHED'),
        );

      await this.menuRepository.update({
        _id: menu._id,
        trashed: false,
        trashedAt: null,
      });

      return right(null);
    } catch (error) {
      console.error('[menu > remove-from-trash][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'REMOVE_FROM_TRASH_MENU_ERROR',
        ),
      );
    }
  }
}
