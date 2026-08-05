import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IMenu as Entity, Merge } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { MenuContractRepository } from '@application/repositories/menu/menu-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';

import type { MenuShowPayload } from '../_shared.validator';

// O repositorio normaliza `parent`/`table` para id (string), mas a response
// declara objetos — o serializador entregava `{}` e o form de edicao recarregava
// ambos como vazio, apagando o vinculo no PATCH seguinte.
type MenuRef = { _id: string; name: string; slug: string; type?: string };

type Response = Either<
  HTTPException,
  Merge<
    Omit<Entity, 'parent' | 'table'>,
    {
      children: Entity[];
      parent: MenuRef | null;
      table: MenuRef | null;
    }
  >
>;
type Payload = MenuShowPayload;

@Service()
export default class MenuShowUseCase {
  constructor(
    private readonly menuRepository: MenuContractRepository,
    private readonly tableRepository: TableContractRepository,
  ) {}

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

      let parent: MenuRef | null = null;
      if (menu.parent) {
        const found = await this.menuRepository.findById(menu.parent);
        if (found) {
          parent = {
            _id: found._id,
            name: found.name,
            slug: found.slug,
            type: found.type,
          };
        }
      }

      let table: MenuRef | null = null;
      if (menu.table) {
        const found = await this.tableRepository.findById(menu.table);
        if (found) {
          table = { _id: found._id, name: found.name, slug: found.slug };
        }
      }

      return right({
        ...menu,
        parent,
        table,
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
