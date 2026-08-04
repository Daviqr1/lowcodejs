import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IMenu as Entity, Paginated } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { MenuContractRepository } from '@application/repositories/menu/menu-contract.repository';
import { HttpResponseContractService } from '@application/services/http-response/http-response-contract.service';

import type { MenuPaginatedPayload } from './paginated.validator';

type Response = Either<HTTPException, Paginated<Entity>>;
type Payload = MenuPaginatedPayload;

@Service()
export default class MenuPaginatedUseCase {
  private getParentId(menu: Entity): string | null {
    const parent: unknown = menu.parent;

    if (!parent) return null;
    if (typeof parent === 'string') return parent;
    if (typeof parent === 'object' && '_id' in parent) {
      return String(parent._id);
    }

    return null;
  }

  private sortByPosition(menus: Entity[], direction: 'asc' | 'desc'): Entity[] {
    return [...menus].sort((a, b) => {
      const orderDiff = (a.order ?? 0) - (b.order ?? 0);
      if (orderDiff !== 0) {
        if (direction === 'asc') return orderDiff;
        return -orderDiff;
      }

      return a.name.localeCompare(b.name);
    });
  }

  private flattenByHierarchy(
    menus: Entity[],
    direction: 'asc' | 'desc',
  ): Entity[] {
    const menuIds = new Set(menus.map((menu) => menu._id));
    const childrenByParent = new Map<string | null, Entity[]>();

    for (const menu of menus) {
      const parentId = this.getParentId(menu);
      let groupKey: string | null = null;
      if (parentId && menuIds.has(parentId)) groupKey = parentId;
      const siblings = childrenByParent.get(groupKey) ?? [];

      siblings.push(menu);
      childrenByParent.set(groupKey, siblings);
    }

    for (const [parentId, children] of childrenByParent.entries()) {
      childrenByParent.set(parentId, this.sortByPosition(children, direction));
    }

    const ordered: Entity[] = [];

    function appendChildren(parentId: string | null): void {
      const children = childrenByParent.get(parentId) ?? [];

      for (const child of children) {
        ordered.push(child);
        appendChildren(child._id);
      }
    }

    appendChildren(null);

    return ordered;
  }
  constructor(
    private readonly menuRepository: MenuContractRepository,
    private readonly http: HttpResponseContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const sort: Record<string, 'asc' | 'desc'> = {};
      if (payload['order-name']) sort.name = payload['order-name'];
      if (payload['order-position']) sort.order = payload['order-position'];
      if (payload['order-slug']) sort.slug = payload['order-slug'];
      if (payload['order-type']) sort.type = payload['order-type'];
      if (payload['order-created-at'])
        sort.createdAt = payload['order-created-at'];
      if (payload['order-owner']) sort['owner.name'] = payload['order-owner'];

      const shouldUseHierarchyOrder =
        Object.keys(sort).length === 0 ||
        (Object.keys(sort).length === 1 && Boolean(sort.order));

      let menus: Entity[];
      let total: number;

      if (shouldUseHierarchyOrder) {
        const allMenus = await this.menuRepository.findMany({
          search: payload.search,
          trashed: payload.trashed ?? false,
          sort: { order: payload['order-position'] ?? 'asc' },
        });

        const orderedMenus = this.flattenByHierarchy(
          allMenus,
          payload['order-position'] ?? 'asc',
        );
        const start = (payload.page - 1) * payload.perPage;
        const end = start + payload.perPage;

        menus = orderedMenus.slice(start, end);
        total = orderedMenus.length;
      } else {
        menus = await this.menuRepository.findMany({
          page: payload.page,
          perPage: payload.perPage,
          search: payload.search,
          trashed: payload.trashed ?? false,
          sort,
        });

        total = await this.menuRepository.count({
          search: payload.search,
          trashed: payload.trashed ?? false,
        });
      }

      const meta = this.http.paginationMeta(total, payload);

      return right({
        meta,
        data: menus,
      });
    } catch (error) {
      console.error('[menu > paginated][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'LIST_MENU_PAGINATED_ERROR',
        ),
      );
    }
  }
}
