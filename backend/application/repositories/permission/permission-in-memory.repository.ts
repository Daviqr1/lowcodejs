import type { FindOptions, IPermission } from '@application/core/entity.core';
import { InMemoryCollectionRepository } from '@application/repositories/in-memory-base.repository';

import type {
  PermissionContractRepository,
  PermissionCreatePayload,
  PermissionQueryPayload,
  PermissionUpdatePayload,
} from './permission-contract.repository';

export default class PermissionInMemoryRepository
  extends InMemoryCollectionRepository<IPermission>
  implements PermissionContractRepository
{
  async create(payload: PermissionCreatePayload): Promise<IPermission> {
    const permission: IPermission = {
      ...payload,
      ...this.stamp(),
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
      return this.matchesTrashed(i, options);
    });
    return item ?? null;
  }

  async findBySlug(
    slug: string,
    options?: FindOptions,
  ): Promise<IPermission | null> {
    const item = this.items.find((i) => {
      if (i.slug !== slug) return false;
      return this.matchesTrashed(i, options);
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

    filtered = this.paginate(filtered, payload);

    return filtered;
  }

  async update({
    _id,
    ...payload
  }: PermissionUpdatePayload): Promise<IPermission> {
    return this.patchById(_id, payload, 'Permission');
  }

  async delete(_id: string): Promise<void> {
    this.removeById(_id, 'Permission');
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
