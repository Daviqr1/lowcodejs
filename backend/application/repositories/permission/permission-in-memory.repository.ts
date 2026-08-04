import type { FindOptions, IPermission } from '@application/core/entity.core';
import { InMemoryRepository } from '@application/repositories/in-memory-base.repository';

import type {
  PermissionContractRepository,
  PermissionCreatePayload,
  PermissionQueryPayload,
  PermissionUpdatePayload,
} from './permission-contract.repository';

export default class PermissionInMemoryRepository
  extends InMemoryRepository
  implements PermissionContractRepository
{
  items: IPermission[] = [];

  async create(payload: PermissionCreatePayload): Promise<IPermission> {
    const permission: IPermission = {
      ...payload,
      _id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      trashedAt: null,
      trashed: false,
    };
    this.items.push(permission);
    return permission;
  }

  async findById(
    _id: string,
    options?: FindOptions,
  ): Promise<IPermission | null> {
    const item = this.items.find((i) => {
      if (i._id !== _id) return false;
      if (options?.trashed !== undefined) return i.trashed === options.trashed;
      return true;
    });
    return item ?? null;
  }

  async findBySlug(
    slug: string,
    options?: FindOptions,
  ): Promise<IPermission | null> {
    const item = this.items.find((i) => {
      if (i.slug !== slug) return false;
      if (options?.trashed !== undefined) return i.trashed === options.trashed;
      return true;
    });
    return item ?? null;
  }

  async findMany(payload?: PermissionQueryPayload): Promise<IPermission[]> {
    this.checkError('findMany');
    let filtered = this.items;

    if (payload?.search) {
      const search = payload.search.toLowerCase();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(search));
    }

    filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));

    if (payload?.page && payload?.perPage) {
      const start = (payload.page - 1) * payload.perPage;
      const end = start + payload.perPage;
      filtered = filtered.slice(start, end);
    }

    return filtered;
  }

  async update({
    _id,
    ...payload
  }: PermissionUpdatePayload): Promise<IPermission> {
    const permission = this.items.find((p) => p._id === _id);
    if (!permission) throw new Error('Permission not found');
    Object.assign(permission, payload, { updatedAt: new Date() });
    return permission;
  }

  async delete(_id: string): Promise<void> {
    const index = this.items.findIndex((p) => p._id === _id);
    if (index === -1) throw new Error('Permission not found');
    this.items.splice(index, 1);
  }

  async count(payload?: PermissionQueryPayload): Promise<number> {
    const filtered = await this.findMany({
      ...payload,
      page: undefined,
      perPage: undefined,
    });
    return filtered.length;
  }
}
