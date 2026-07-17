import { Service } from 'fastify-decorators';

import type { IReaction } from '@application/core/entity.core';
import type { FindOptions } from '@application/core/entity.core';
import { Reaction as Model } from '@application/model/reaction.model';

import type {
  ReactionContractRepository,
  ReactionCreatePayload,
  ReactionQueryPayload,
  ReactionUpdatePayload,
} from './reaction-contract.repository';

@Service()
export default class ReactionMongooseRepository implements ReactionContractRepository {
  private readonly populateOptions = [{ path: 'user' }];

  private buildWhereClause(
    payload?: ReactionQueryPayload,
  ): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    if (payload?.user) where.user = payload.user;
    if (payload?.type) where.type = payload.type;

    return where;
  }

  private transform(entity: InstanceType<typeof Model>): IReaction {
    return {
      ...entity.toJSON({ flattenObjectIds: true }),
      _id: entity._id.toString(),
    };
  }

  async create(payload: ReactionCreatePayload): Promise<IReaction> {
    const created = await Model.create(payload);
    const populated = await created.populate(this.populateOptions);
    return this.transform(populated);
  }

  async findByIdAndUser(
    _id: string,
    user: string,
    options?: FindOptions,
  ): Promise<IReaction | null> {
    const where: Record<string, unknown> = { _id, user };
    if (options?.trashed !== undefined) {
      where.trashed = options.trashed;
    }

    const reaction = await Model.findOne(where).populate(this.populateOptions);
    if (!reaction) return null;

    return this.transform(reaction);
  }

  async findMany(payload?: ReactionQueryPayload): Promise<IReaction[]> {
    const where = this.buildWhereClause(payload);

    let skip: number | undefined;
    let take: number | undefined;

    if (payload?.page && payload?.perPage) {
      skip = (payload.page - 1) * payload.perPage;
      take = payload.perPage;
    }

    const reactions = await Model.find(where)
      .populate(this.populateOptions)
      .sort({ createdAt: 'desc' })
      .skip(skip ?? 0)
      .limit(take ?? 0);

    return reactions.map((r) => this.transform(r));
  }

  async update({ _id, ...payload }: ReactionUpdatePayload): Promise<IReaction> {
    const reaction = await Model.findOne({ _id });

    if (!reaction) throw new Error('Reaction not found');

    reaction.set(payload);

    await reaction.save();

    const populated = await reaction.populate(this.populateOptions);

    return this.transform(populated);
  }

  async delete(_id: string): Promise<void> {
    await Model.deleteOne({ _id });
  }

  async count(payload?: ReactionQueryPayload): Promise<number> {
    const where = this.buildWhereClause(payload);
    return Model.countDocuments(where);
  }
}
