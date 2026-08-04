import {
  E_USER_STATUS,
  type FindOptions,
  type IUser,
} from '@application/core/entity.core';
import { InMemoryRepository } from '@application/repositories/in-memory-base.repository';

import { EntityFixtures } from '../entity-fixtures';

import type {
  UserContractRepository,
  UserCreatePayload,
  UserQueryPayload,
  UserUpdateManyPayload,
  UserUpdatePayload,
} from './user-contract.repository';

const fixtures = new EntityFixtures();

export default class UserInMemoryRepository
  extends InMemoryRepository
  implements UserContractRepository
{
  items: IUser[] = [];

  async create(payload: UserCreatePayload): Promise<IUser> {
    const user: IUser = {
      ...payload,
      _id: crypto.randomUUID(),
      status: E_USER_STATUS.ACTIVE,
      // Double de teste: refs populadas de grupo com defaults inertes.
      group: fixtures.makeGroup(payload.group),
      groups: (payload.groups ?? []).map((id) => fixtures.makeGroup(id)),
      notificationsEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      trashedAt: null,
      trashed: false,
    };
    this.items.push(user);
    return user;
  }

  async findById(_id: string, options?: FindOptions): Promise<IUser | null> {
    this.checkError('findById');
    const item = this.items.find((i) => {
      if (i._id !== _id) return false;
      if (options?.trashed !== undefined) return i.trashed === options.trashed;
      return !i.trashed;
    });
    return item ?? null;
  }

  async findByEmail(
    email: string,
    options?: FindOptions,
  ): Promise<IUser | null> {
    this.checkError('findByEmail');
    const item = this.items.find((i) => {
      if (i.email !== email) return false;
      if (options?.trashed !== undefined) return i.trashed === options.trashed;
      return !i.trashed;
    });
    return item ?? null;
  }

  async findMany(payload?: UserQueryPayload): Promise<IUser[]> {
    this.checkError('findMany');
    let filtered = this.items;

    // Filtro por trashed
    if (payload?.trashed !== undefined) {
      filtered = filtered.filter((user) => user.trashed === payload.trashed);
    } else {
      filtered = filtered.filter((user) => !user.trashed);
    }

    // Filtro por múltiplos IDs
    if (payload?._ids && payload._ids.length > 0) {
      filtered = filtered.filter((user) => payload._ids!.includes(user._id));
    }

    // Filtro por status
    if (payload?.status) {
      filtered = filtered.filter((user) => user.status === payload.status);
    }

    // Filtro por grupo
    if (payload?.group) {
      filtered = filtered.filter((user) => {
        let groupId: string | undefined;
        if (typeof user.group === 'string') groupId = user.group;
        if (typeof user.group !== 'string') groupId = user.group?._id;
        return groupId === payload.group;
      });
    }

    if (payload?.search) {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(payload.search!.toLowerCase()) ||
          user.email.toLowerCase().includes(payload.search!.toLowerCase()),
      );
    }

    if (payload?.page && payload?.perPage) {
      const start = (payload.page - 1) * payload.perPage;
      const end = start + payload.perPage;
      filtered = filtered.slice(start, end);
    }

    return filtered;
  }

  async update({ _id, ...payload }: UserUpdatePayload): Promise<IUser> {
    this.checkError('update');
    const updated = this.items.find((user) => user._id === _id);
    if (!updated) throw new Error('User not found');
    Object.assign(updated, payload, { updatedAt: new Date() });
    return updated;
  }

  async updateMany({
    _ids,
    filterTrashed,
    data,
  }: UserUpdateManyPayload): Promise<number> {
    this.checkError('updateMany');
    let filtered = this.items.filter((u) => _ids.includes(u._id));

    if (filterTrashed !== undefined) {
      filtered = filtered.filter((u) => u.trashed === filterTrashed);
    }

    for (const user of filtered) {
      if (data.trashed !== undefined) user.trashed = data.trashed;
      if (data.trashedAt !== undefined) user.trashedAt = data.trashedAt;
      if (data.status !== undefined) user.status = data.status;
      user.updatedAt = new Date();
    }

    return filtered.length;
  }

  async findManyTrashed(): Promise<IUser[]> {
    this.checkError('findManyTrashed');
    return this.items.filter((u) => u.trashed);
  }

  async delete(_id: string): Promise<void> {
    this.checkError('delete');
    const index = this.items.findIndex((u) => u._id === _id);
    if (index === -1) throw new Error('User not found');
    this.items.splice(index, 1);
  }

  async deleteMany(_ids: string[]): Promise<number> {
    this.checkError('deleteMany');
    const before = this.items.length;
    this.items = this.items.filter((u) => !_ids.includes(u._id));
    return before - this.items.length;
  }

  async count(payload?: UserQueryPayload): Promise<number> {
    this.checkError('count');
    const filtered = await this.findMany({
      ...payload,
      page: undefined,
      perPage: undefined,
    });

    return filtered.length;
  }
}
