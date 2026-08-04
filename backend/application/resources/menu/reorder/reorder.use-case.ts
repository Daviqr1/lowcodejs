import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { MenuContractRepository } from '@application/repositories/menu/menu-contract.repository';

import type { MenuReorderPayload } from './reorder.validator';

type Response = Either<HTTPException, null>;

@Service()
export default class MenuReorderUseCase {
  constructor(private readonly menuRepository: MenuContractRepository) {}

  async execute(payload: MenuReorderPayload): Promise<Response> {
    try {
      if (payload.items.length === 0) {
        return left(
          HTTPException.BadRequest(
            'Lista de itens está vazia',
            'INVALID_PARAMETERS',
          ),
        );
      }

      const shouldUpdateParents = payload.items.some((item) =>
        Object.prototype.hasOwnProperty.call(item, 'parent'),
      );
      let commonParent: string | null | undefined;
      const menuIds = new Set<string>();
      const nextParentById = new Map<string, string | null>();

      for (const item of payload.items) {
        const menu = await this.menuRepository.findById(item._id, {
          trashed: false,
        });

        if (!menu) {
          return left(
            HTTPException.NotFound(
              `Menu ${item._id} não encontrado`,
              'MENU_NOT_FOUND',
            ),
          );
        }

        menuIds.add(item._id);
        nextParentById.set(item._id, item.parent ?? menu.parent ?? null);

        if (!shouldUpdateParents) {
          if (commonParent === undefined) {
            commonParent = menu.parent;
          } else if (menu.parent !== commonParent) {
            return left(
              HTTPException.BadRequest(
                'Todos os itens devem compartilhar o mesmo pai',
                'INVALID_PARAMETERS',
              ),
            );
          }
        }
      }

      if (shouldUpdateParents) {
        for (const item of payload.items) {
          const parent = nextParentById.get(item._id) ?? null;

          if (parent === item._id) {
            return left(
              HTTPException.BadRequest(
                'Um menu não pode ser pai de si mesmo',
                'INVALID_PARAMETERS',
              ),
            );
          }

          if (parent && !menuIds.has(parent)) {
            const parentMenu = await this.menuRepository.findById(parent, {
              trashed: false,
            });

            if (!parentMenu) {
              return left(
                HTTPException.NotFound(
                  `Menu pai ${parent} não encontrado`,
                  'MENU_NOT_FOUND',
                ),
              );
            }
          }

          const visited = new Set<string>();
          let currentParent = parent;

          while (currentParent) {
            if (currentParent === item._id || visited.has(currentParent)) {
              return left(
                HTTPException.BadRequest(
                  'Hierarquia de menus inválida',
                  'INVALID_PARAMETERS',
                ),
              );
            }

            visited.add(currentParent);
            currentParent = nextParentById.get(currentParent) ?? null;
          }
        }
      }

      for (const item of payload.items) {
        await this.menuRepository.update({
          _id: item._id,
          order: item.order,
          // Mesmo fallback usado na validacao (`:49`): item sem `parent` num
          // lote misto mantem o pai atual em vez de ir para a raiz.
          ...(shouldUpdateParents && {
            parent: nextParentById.get(item._id) ?? null,
          }),
        });
      }

      return right(null);
    } catch (error) {
      console.error('[menu > reorder][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'REORDER_MENU_ERROR',
        ),
      );
    }
  }
}
