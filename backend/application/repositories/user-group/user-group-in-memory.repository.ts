import {
  E_ROLE,
  type FindOptions,
  type IGroup,
} from '@application/core/entity.core';

import { makePermission } from '../entity-fixtures';

import type {
  UserGroupContractRepository,
  UserGroupCreatePayload,
  UserGroupQueryPayload,
  UserGroupUpdateManyPayload,
  UserGroupUpdatePayload,
} from './user-group-contract.repository';

export default class UserGroupInMemoryRepository implements UserGroupContractRepository {
  items: IGroup[] = [];
  private _forcedErrors = new Map<string, Error>();

  simulateError(method: string, error: Error): void {
    this._forcedErrors.set(method, error);
  }

  private _checkError(method: string): void {
    const err = this._forcedErrors.get(method);
    if (err) {
      this._forcedErrors.delete(method);
      throw err;
    }
  }

  async create(payload: UserGroupCreatePayload): Promise<IGroup> {
    const group: IGroup = {
      ...payload,
      _id: crypto.randomUUID(),
      description: payload.description ?? null,
      // Double de teste: refs populadas de permissão com defaults inertes.
      permissions: payload.permissions.map((p) => makePermission(p)),
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
    this._checkError('findById');
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
  ): Promise<IGroup | null> {
    this._checkError('findBySlug');
    const item = this.items.find((i) => {
      if (i.slug !== slug) return false;
      if (options?.trashed !== undefined) return i.trashed === options.trashed;
      return true;
    });
    return item ?? null;
  }

  async findMany(payload?: UserGroupQueryPayload): Promise<IGroup[]> {
    this._checkError('findMany');
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

    if (payload?.page && payload?.perPage) {
      const start = (payload.page - 1) * payload.perPage;
      const end = start + payload.perPage;
      filtered = filtered.slice(start, end);
    }

    return filtered;
  }

  async update({ _id, ...payload }: UserGroupUpdatePayload): Promise<IGroup> {
    this._checkError('update');
    const group = this.items.find((g) => g._id === _id);
    if (!group) throw new Error('UserGroup not found');
    Object.assign(group, payload, { updatedAt: new Date() });
    return group;
  }

  async updateMany({
    _ids,
    filterTrashed,
    data,
  }: UserGroupUpdateManyPayload): Promise<number> {
    this._checkError('updateMany');
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
    this._checkError('findManyTrashed');
    return this.items.filter((g) => g.trashed);
  }

  async delete(_id: string): Promise<void> {
    this._checkError('delete');
    const index = this.items.findIndex((g) => g._id === _id);
    if (index === -1) throw new Error('UserGroup not found');
    this.items.splice(index, 1);
  }

  async deleteMany(_ids: string[]): Promise<number> {
    this._checkError('deleteMany');
    const before = this.items.length;
    this.items = this.items.filter((g) => !_ids.includes(g._id));
    return before - this.items.length;
  }

  async count(payload?: UserGroupQueryPayload): Promise<number> {
    this._checkError('count');
    const filtered = await this.findMany({
      ...payload,
      page: undefined,
      perPage: undefined,
    });
    return filtered.length;
  }
}
