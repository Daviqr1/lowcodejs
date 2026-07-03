import type { FindOptions, IReaction } from '@application/core/entity.core';

import { makeUser } from '../entity-fixtures';

import type {
  ReactionContractRepository,
  ReactionCreatePayload,
  ReactionQueryPayload,
  ReactionUpdatePayload,
} from './reaction-contract.repository';

export default class ReactionInMemoryRepository implements ReactionContractRepository {
  items: IReaction[] = [];
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

  async create(payload: ReactionCreatePayload): Promise<IReaction> {
    const reaction: IReaction = {
      ...payload,
      _id: crypto.randomUUID(),
      // Double de teste: ref populada de usuário com defaults inertes.
      user: makeUser(payload.user),
      createdAt: new Date(),
      updatedAt: new Date(),
      trashedAt: null,
      trashed: false,
    };
    this.items.push(reaction);
    return reaction;
  }

  async findByIdAndUser(
    _id: string,
    user: string,
    options?: FindOptions,
  ): Promise<IReaction | null> {
    const item = this.items.find((i) => {
      if (i._id !== _id) return false;
      if (i.user?._id !== user) return false;
      if (options?.trashed !== undefined) return i.trashed === options.trashed;
      return true;
    });
    return item ?? null;
  }

  async findMany(payload?: ReactionQueryPayload): Promise<IReaction[]> {
    let filtered = this.items;

    if (payload?.user) {
      filtered = filtered.filter((r) => r.user?._id === payload.user);
    }

    if (payload?.type) {
      filtered = filtered.filter((r) => r.type === payload.type);
    }

    if (payload?.page && payload?.perPage) {
      const start = (payload.page - 1) * payload.perPage;
      const end = start + payload.perPage;
      filtered = filtered.slice(start, end);
    }

    return filtered;
  }

  async update({ _id, ...payload }: ReactionUpdatePayload): Promise<IReaction> {
    const reaction = this.items.find((r) => r._id === _id);
    if (!reaction) throw new Error('Reaction not found');
    Object.assign(reaction, payload, { updatedAt: new Date() });
    return reaction;
  }

  async delete(_id: string): Promise<void> {
    const index = this.items.findIndex((r) => r._id === _id);
    if (index === -1) throw new Error('Reaction not found');
    this.items.splice(index, 1);
  }

  async count(payload?: ReactionQueryPayload): Promise<number> {
    const filtered = await this.findMany({
      ...payload,
      page: undefined,
      perPage: undefined,
    });
    return filtered.length;
  }
}
