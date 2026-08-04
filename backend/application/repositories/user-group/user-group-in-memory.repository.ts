import {
  E_ROLE,
  type FindOptions,
  type IGroup,
} from '@application/core/entity.core';
import { InMemoryCollectionRepository } from '@application/repositories/in-memory-base.repository';

import { EntityFixtures } from '../entity-fixtures';

import type {
  UserGroupContractRepository,
  UserGroupCreatePayload,
  UserGroupQueryPayload,
  UserGroupUpdateManyPayload,
  UserGroupUpdatePayload,
} from './user-group-contract.repository';

const fixtures = new EntityFixtures();

export default class UserGroupInMemoryRepository
  extends InMemoryCollectionRepository<IGroup>
  implements UserGroupContractRepository
{
  async create(payload: UserGroupCreatePayload): Promise<IGroup> {
    const group: IGroup = {
      ...payload,
      _id: crypto.randomUUID(),
      description: payload.description ?? null,
      // Double de teste: refs populadas de permissão com defaults inertes.
      permissions: payload.permissions.map((p) => fixtures.makePermission(p)),
      encompasses: payload.encompasses ?? [],
      createdAt: new Date(),
      updatedAt: new Date(),
      trashedAt: null,
      trashed: false,
    };
    this.items.push(group);
    return group;
  }

  async findById(_id: string, options?: FindOptions): Promise<IGroup | null> {
    this.checkError('findById');
    const item = this.items.find((i) => {
      if (i._id !== _id) return false;
      return this.matchesTrashed(i, options);
    });
    return item ?? null;
  }

  async findBySlug(
    slug: string,
    options?: FindOptions,
  ): Promise<IGroup | null> {
    this.checkError('findBySlug');
    const item = this.items.find((i) => {
      if (i.slug !== slug) return false;
      return this.matchesTrashed(i, options);
    });
    return item ?? null;
  }

  async findMany(payload?: UserGroupQueryPayload): Promise<IGroup[]> {
    this.checkError('findMany');
    let filtered = this.items;

    if (payload?.trashed !== undefined) {
      filtered = filtered.filter((g) => g.trashed === payload.trashed);
    } else {
      filtered = filtered.filter((g) => !g.trashed);
    }

    // Esconde o grupo MASTER pela flag resolvida pelo fecho de grupos
    // (shouldHideMaster), nao mais pelo role do JWT — alinhado ao repo mongoose.
    if (payload?.hideMaster) {
      filtered = filtered.filter((g) => g.slug !== E_ROLE.MASTER);
    }

    if (payload?.search) {
      const search = payload.search.toLowerCase();
      filtered = filtered.filter(
        (g) =>
          g.name.toLowerCase().includes(search) ||
          (g.description?.toLowerCase().includes(search) ?? false),
      );
    }

    filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));

    filtered = this.paginate(filtered, payload);

    return filtered;
  }

  async update({ _id, ...payload }: UserGroupUpdatePayload): Promise<IGroup> {
    this.checkError('update');
    return this.patchById(_id, payload, 'UserGroup');
  }

  async updateMany({
    _ids,
    filterTrashed,
    data,
  }: UserGroupUpdateManyPayload): Promise<number> {
    this.checkError('updateMany');
    let filtered = this.items.filter((g) => _ids.includes(g._id));

    if (filterTrashed !== undefined) {
      filtered = filtered.filter((g) => g.trashed === filterTrashed);
    }

    for (const group of filtered) {
      if (data.trashed !== undefined) group.trashed = data.trashed;
      if (data.trashedAt !== undefined) group.trashedAt = data.trashedAt;
      group.updatedAt = new Date();
    }

    return filtered.length;
  }

  async findManyTrashed(): Promise<IGroup[]> {
    this.checkError('findManyTrashed');
    return this.items.filter((g) => g.trashed);
  }

  async delete(_id: string): Promise<void> {
    this.checkError('delete');
    this.removeById(_id, 'UserGroup');
  }

  async deleteMany(_ids: string[]): Promise<number> {
    this.checkError('deleteMany');
    const before = this.items.length;
    this.items = this.items.filter((g) => !_ids.includes(g._id));
    return before - this.items.length;
  }

  async count(payload?: UserGroupQueryPayload): Promise<number> {
    this.checkError('count');
    const filtered = await this.findMany({
      ...payload,
      page: undefined,
      perPage: undefined,
    });
    return filtered.length;
  }
}
