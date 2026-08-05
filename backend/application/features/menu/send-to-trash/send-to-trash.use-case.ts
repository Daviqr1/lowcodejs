import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { MenuContractRepository } from '@application/repositories/menu/menu-contract.repository';

import type { MenuSendToTrashPayload } from '../_shared.validator';

type Response = Either<HTTPException, null>;
type Payload = MenuSendToTrashPayload;

@Service()
export default class MenuSendToTrashUseCase {
  constructor(private readonly menuRepository: MenuContractRepository) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const menu = await this.menuRepository.findById(payload._id, {
        trashed: false,
      });

      if (!menu)
        return left(
          HTTPException.NotFound('Menu não encontrado', 'MENU_NOT_FOUND'),
        );

      const childrenCount = await this.menuRepository.count({
        parent: menu._id,
        trashed: false,
      });

      if (childrenCount > 0) {
        return left(
          HTTPException.Conflict(
            'Menu possui filhos ativos',
            'MENU_HAS_CHILDREN',
          ),
        );
      }

      await this.menuRepository.update({
        _id: menu._id,
        trashed: true,
        trashedAt: new Date(),
      });

      return right(null);
    } catch (error) {
      console.error('[menu > send-to-trash][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'SEND_TO_TRASH_MENU_ERROR',
        ),
      );
    }
  }
}
