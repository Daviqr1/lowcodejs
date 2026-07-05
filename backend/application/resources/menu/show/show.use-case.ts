import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IMenu as Entity, Merge } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { MenuContractRepository } from '@application/repositories/menu/menu-contract.repository';

import type { MenuShowPayload } from './show.validator';

type Response = Either<HTTPException, Merge<Entity, { children: Entity[] }>>;
type Payload = MenuShowPayload;

@Service()
export default class MenuShowUseCase {
  constructor(private readonly menuRepository: MenuContractRepository) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const menu = await this.menuRepository.findById(payload._id);

      if (!menu)
        return left(
          HTTPException.NotFound('Menu não encontrado', 'MENU_NOT_FOUND'),
        );

      const children = await this.menuRepository.findMany({
        parent: payload._id,
        trashed: false,
        sort: { order: 'asc' },
      });

      return right({
        ...menu,
        children,
      });
    } catch (error) {
      console.error('[menu > show][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'GET_MENU_BY_ID_ERROR',
        ),
      );
    }
  }
}
