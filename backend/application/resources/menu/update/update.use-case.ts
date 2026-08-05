import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import {
  E_EXTENSION_TYPE,
  E_MENU_ITEM_TYPE,
  type IMenu as Entity,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { ExtensionContractRepository } from '@application/repositories/extension/extension-contract.repository';
import {
  MenuContractRepository,
  type MenuUpdatePayload as RepositoryMenuUpdatePayload,
} from '@application/repositories/menu/menu-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { SlugContractService } from '@application/services/slug/slug-contract.service';

import type { MenuUpdatePayload } from '../_shared.validator';

type Response = Either<HTTPException, Entity>;
type Payload = MenuUpdatePayload;

@Service()
export default class MenuUpdateUseCase {
  private getMenuId(value: Entity['parent'] | undefined): string | null {
    return value ?? null;
  }
  constructor(
    private readonly menuRepository: MenuContractRepository,
    private readonly tableRepository: TableContractRepository,
    private readonly extensionRepository: ExtensionContractRepository,
    private readonly slugService: SlugContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const existingMenu = await this.menuRepository.findById(payload._id, {
        trashed: false,
      });

      if (!existingMenu)
        return left(
          HTTPException.NotFound('Menu não encontrado', 'MENU_NOT_FOUND'),
        );

      if (
        existingMenu.type === E_MENU_ITEM_TYPE.SEPARATOR &&
        payload.type &&
        payload.type !== E_MENU_ITEM_TYPE.SEPARATOR
      ) {
        const childrenCount = await this.menuRepository.count({
          parent: existingMenu._id,
          trashed: false,
        });

        if (childrenCount > 0) {
          return left(
            HTTPException.Conflict(
              'Separador com submenus ativos não pode mudar de tipo',
              'SEPARATOR_HAS_CHILDREN',
              {
                type: 'Separador com submenus ativos não pode mudar de tipo',
              },
            ),
          );
        }
      }

      const finalType = payload.type ?? existingMenu.type;

      if (finalType === E_MENU_ITEM_TYPE.SEPARATOR && payload.isInitial) {
        return left(
          HTTPException.BadRequest(
            'Separador não pode ser página inicial',
            'INVALID_PARAMETERS',
            {
              isInitial: 'Separador não pode ser página inicial',
            },
          ),
        );
      }

      let finalSlug = payload.slug || existingMenu.slug;
      let parent = null;

      if (payload.parent !== undefined) {
        if (payload.parent) {
          // Check self-reference
          if (payload.parent === payload._id) {
            return left(
              HTTPException.BadRequest(
                'Menu não pode ser pai de si mesmo',
                'CIRCULAR_REFERENCE',
                { parent: 'Menu não pode ser pai de si mesmo' },
              ),
            );
          }

          // Check circular reference: ensure the new parent is not a descendant
          const descendantIds = await this.menuRepository.findDescendantIds(
            payload._id,
          );

          if (descendantIds.includes(payload.parent)) {
            return left(
              HTTPException.BadRequest(
                'Referência circular detectada',
                'CIRCULAR_REFERENCE',
                { parent: 'Referência circular detectada' },
              ),
            );
          }

          parent = await this.menuRepository.findById(payload.parent, {
            trashed: false,
          });

          if (!parent)
            return left(
              HTTPException.NotFound(
                'Menu pai não encontrado',
                'PARENT_MENU_NOT_FOUND',
                { parent: 'Menu pai não encontrado' },
              ),
            );

          finalSlug = this.slugService.normalize(
            finalSlug.concat('-').concat(parent.slug),
          );
        }
      } else if (existingMenu.parent) {
        const currentParent = await this.menuRepository.findById(
          existingMenu.parent,
          { trashed: false },
        );
        if (currentParent) {
          finalSlug = this.slugService.normalize(
            finalSlug.concat('-').concat(currentParent.slug),
          );
        }
      }

      if (finalSlug !== existingMenu.slug) {
        const menuWithSameSlug = await this.menuRepository.findBySlug(
          finalSlug,
          { trashed: false },
        );

        if (menuWithSameSlug && menuWithSameSlug._id !== payload._id)
          return left(
            HTTPException.Conflict('Menu já existe', 'MENU_ALREADY_EXISTS', {
              name: 'Menu já existe',
            }),
          );
      }

      if (
        payload.type &&
        (payload.type === E_MENU_ITEM_TYPE.TABLE ||
          payload.type === E_MENU_ITEM_TYPE.FORM)
      ) {
        if (!payload.table) {
          return left(
            HTTPException.BadRequest(
              'ID da tabela é obrigatório para tipos tabela/formulário',
              'INVALID_PARAMETERS',
              {
                table:
                  'ID da tabela é obrigatório para tipos tabela/formulário',
              },
            ),
          );
        }

        const table = await this.tableRepository.findById(payload.table);

        if (!table)
          return left(
            HTTPException.NotFound('Tabela não encontrada', 'TABLE_NOT_FOUND', {
              table: 'Tabela não encontrada',
            }),
          );

        if (payload.type === E_MENU_ITEM_TYPE.TABLE)
          payload.url = '/tables/'.concat(table.slug);

        if (payload.type === E_MENU_ITEM_TYPE.FORM)
          payload.url = '/tables/'.concat(table.slug).concat('/row/create');
      }

      if (payload.type && payload.type === E_MENU_ITEM_TYPE.PAGE) {
        payload.url = '/pages/'.concat(finalSlug);
      }

      if (payload.type && payload.type === E_MENU_ITEM_TYPE.EXTENSION_MODULE) {
        const ref = payload.extension;
        if (!ref?.pkg || !ref?.extensionId) {
          return left(
            HTTPException.BadRequest(
              'Selecione um módulo de extensão',
              'INVALID_PARAMETERS',
              { extension: 'Selecione um módulo de extensão' },
            ),
          );
        }

        const extension = await this.extensionRepository.findByKey(
          ref.pkg,
          E_EXTENSION_TYPE.MODULE,
          ref.extensionId,
        );

        if (!extension) {
          return left(
            HTTPException.NotFound(
              'Módulo de extensão não encontrado',
              'EXTENSION_NOT_FOUND',
              { extension: 'Módulo de extensão não encontrado' },
            ),
          );
        }

        if (!extension.enabled || !extension.available) {
          return left(
            HTTPException.BadRequest(
              'Módulo de extensão não está ativo',
              'EXTENSION_NOT_ACTIVE',
              { extension: 'Módulo de extensão não está ativo' },
            ),
          );
        }

        payload.url = '/e/'.concat(ref.pkg).concat('/').concat(ref.extensionId);
      }

      // If parent changed, recalculate order
      const updatePayload: RepositoryMenuUpdatePayload = {
        ...payload,
        slug: finalSlug,
      };

      if (finalType === E_MENU_ITEM_TYPE.SEPARATOR) {
        updatePayload.isInitial = false;
      }

      const currentParentId = this.getMenuId(existingMenu.parent);
      let nextParentId = currentParentId;
      if (payload.parent !== undefined) nextParentId = payload.parent;
      const parentChanged =
        payload.parent !== undefined && payload.parent !== currentParentId;

      if (parentChanged && payload.order === undefined) {
        const siblingCount = await this.menuRepository.count({
          parent: nextParentId,
          trashed: false,
        });
        updatePayload.order = siblingCount;
      }

      const shouldReorderSiblings =
        parentChanged || payload.order !== undefined;

      if (shouldReorderSiblings) {
        const siblings = await this.menuRepository.findMany({
          parent: nextParentId,
          trashed: false,
          sort: { order: 'asc', name: 'asc' },
        });
        const siblingsWithoutCurrent = siblings.filter(
          (menu) => menu._id !== payload._id,
        );
        let requestedOrder = siblingsWithoutCurrent.length;
        if (typeof updatePayload.order === 'number') {
          requestedOrder = updatePayload.order;
        }
        const nextOrder = Math.min(
          Math.max(requestedOrder, 0),
          siblingsWithoutCurrent.length,
        );
        const reorderedIds = [
          ...siblingsWithoutCurrent.slice(0, nextOrder).map((menu) => menu._id),
          payload._id,
          ...siblingsWithoutCurrent.slice(nextOrder).map((menu) => menu._id),
        ];

        updatePayload.order = nextOrder;

        const updated = await this.menuRepository.update(updatePayload);

        for (let index = 0; index < reorderedIds.length; index += 1) {
          const menuId = reorderedIds[index];
          if (menuId === payload._id) continue;
          await this.menuRepository.update({
            _id: menuId,
            order: index,
          });
        }

        if (payload.isInitial) {
          await this.menuRepository.setOnlyInitial(updated._id);
        }

        return right(updated);
      }

      const updated = await this.menuRepository.update(updatePayload);

      if (payload.isInitial) {
        await this.menuRepository.setOnlyInitial(updated._id);
      }

      return right(updated);
    } catch (error) {
      console.error('[menu > update][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'UPDATE_MENU_ERROR',
        ),
      );
    }
  }
}
