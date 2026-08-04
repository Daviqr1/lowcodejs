import type { FindOptions, IMenu } from '@application/core/entity.core';
import { InMemoryCollectionRepository } from '@application/repositories/in-memory-base.repository';

import type {
  MenuContractRepository,
  MenuCreatePayload,
  MenuQueryPayload,
  MenuUpdateManyPayload,
  MenuUpdatePayload,
} from './menu-contract.repository';

export default class MenuInMemoryRepository
  extends InMemoryCollectionRepository<IMenu>
  implements MenuContractRepository
{
  async create(payload: MenuCreatePayload): Promise<IMenu> {
    const menu: IMenu = {
      ...payload,
      _id: crypto.randomUUID(),
      owner: payload.owner ?? null,
      table: payload.table ?? null,
      parent: payload.parent ?? null,
      url: payload.url ?? null,
      html: payload.html ?? null,
      icon: payload.icon ?? null,
      order: payload.order ?? 0,
      isInitial: payload.isInitial ?? false,
      extension: payload.extension ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      trashedAt: null,
      trashed: false,
    };
    this.items.push(menu);
    return menu;
  }

  async findById(_id: string, options?: FindOptions): Promise<IMenu | null> {
    this.checkError('findById');
    const item = this.items.find((i) => {
      if (i._id !== _id) return false;
      return this.matchesTrashed(i, options);
    });
    return item ?? null;
  }

  async findBySlug(slug: string, options?: FindOptions): Promise<IMenu | null> {
    this.checkError('findBySlug');
    const item = this.items.find((i) => {
      if (i.slug !== slug) return false;
      return this.matchesTrashed(i, options);
    });
    return item ?? null;
  }

  async findMany(payload?: MenuQueryPayload): Promise<IMenu[]> {
    this.checkError('findMany');
    let filtered = this.items;

    const trashed = payload?.trashed ?? false;
    filtered = filtered.filter((m) => m.trashed === trashed);

    if (payload?.parent !== undefined) {
      filtered = filtered.filter((m) => m.parent === payload.parent);
    }

    if (payload?.search) {
      const search = payload.search.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(search) ||
          m.slug.toLowerCase().includes(search),
      );
    }

    filtered = filtered.sort((a, b) => {
      const orderDiff = (a.order ?? 0) - (b.order ?? 0);
      if (orderDiff !== 0) return orderDiff;
      return a.name.localeCompare(b.name);
    });

    filtered = this.paginate(filtered, payload);

    return filtered;
  }

  async update({ _id, ...payload }: MenuUpdatePayload): Promise<IMenu> {
    this.checkError('update');
    return this.patchById(_id, payload, 'Menu');
  }

  async updateMany({
    _ids,
    filterTrashed,
    data,
  }: MenuUpdateManyPayload): Promise<number> {
    this.checkError('updateMany');
    let filtered = this.items.filter((m) => _ids.includes(m._id));

    if (filterTrashed !== undefined) {
      filtered = filtered.filter((m) => m.trashed === filterTrashed);
    }

    for (const menu of filtered) {
      if (data.trashed !== undefined) menu.trashed = data.trashed;
      if (data.trashedAt !== undefined) menu.trashedAt = data.trashedAt;
      if (data.isInitial !== undefined) menu.isInitial = data.isInitial;
      menu.updatedAt = new Date();
    }

    return filtered.length;
  }

  async findManyTrashed(): Promise<IMenu[]> {
    this.checkError('findManyTrashed');
    return this.items.filter((m) => m.trashed);
  }

  async delete(_id: string): Promise<void> {
    this.checkError('delete');
    this.removeById(_id, 'Menu');
  }

  async deleteMany(_ids: string[]): Promise<number> {
    this.checkError('deleteMany');
    const before = this.items.length;
    this.items = this.items.filter((m) => !_ids.includes(m._id));
    return before - this.items.length;
  }

  async count(payload?: MenuQueryPayload): Promise<number> {
    this.checkError('count');
    const filtered = await this.findMany({
      ...payload,
      page: undefined,
      perPage: undefined,
    });
    return filtered.length;
  }

  async findDescendantIds(menuId: string): Promise<string[]> {
    const descendants: string[] = [];
    const queue = [menuId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = this.items.filter((m) => m.parent === currentId);
      for (const child of children) {
        descendants.push(child._id);
        queue.push(child._id);
      }
    }

    return descendants;
  }

  async setOnlyInitial(_id: string): Promise<void> {
    this.checkError('setOnlyInitial');
    for (const menu of this.items) {
      const shouldBeInitial = menu._id === _id;
      if (menu.isInitial !== shouldBeInitial) {
        menu.isInitial = shouldBeInitial;
        menu.updatedAt = new Date();
      }
    }
  }
}
