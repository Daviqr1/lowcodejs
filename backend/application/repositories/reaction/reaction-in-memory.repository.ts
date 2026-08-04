import type { FindOptions, IReaction } from '@application/core/entity.core';
import { InMemoryCollectionRepository } from '@application/repositories/in-memory-base.repository';

import { EntityFixtures } from '../entity-fixtures';

import type {
  ReactionContractRepository,
  ReactionCreatePayload,
  ReactionQueryPayload,
  ReactionUpdatePayload,
} from './reaction-contract.repository';

const fixtures = new EntityFixtures();

export default class ReactionInMemoryRepository
  extends InMemoryCollectionRepository<IReaction>
  implements ReactionContractRepository
{
  async create(payload: ReactionCreatePayload): Promise<IReaction> {
    const reaction: IReaction = {
      ...payload,
      _id: crypto.randomUUID(),
      // Double de teste: ref populada de usuário com defaults inertes.
      user: fixtures.makeUser(payload.user),
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
      return this.matchesTrashed(i, options);
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

    filtered = this.paginate(filtered, payload);

    return filtered;
  }

  async update({ _id, ...payload }: ReactionUpdatePayload): Promise<IReaction> {
    return this.patchById(_id, payload, 'Reaction');
  }

  async delete(_id: string): Promise<void> {
    this.removeById(_id, 'Reaction');
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
