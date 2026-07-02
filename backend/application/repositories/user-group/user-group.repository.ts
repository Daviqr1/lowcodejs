/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import { E_ROLE, type IGroup } from '@application/core/entity.core';
import type { FindOptions } from '@application/core/entity.core';
import { UserGroup as Model } from '@application/model/user-group.model';
import { QueryBuilderContractService } from '@application/services/table/query-builder-contract.service';

import type {
  UserGroupContractRepository,
  UserGroupCreatePayload,
  UserGroupQueryPayload,
  UserGroupUpdateManyPayload,
  UserGroupUpdatePayload,
} from './user-group-contract.repository';

@Service()
export default class UserGroupMongooseRepository implements UserGroupContractRepository {
  constructor(private readonly query: QueryBuilderContractService) {}

  private readonly populateOptions = [{ path: 'permissions' }];

  private async buildWhereClause(
    payload?: UserGroupQueryPayload,
  ): Promise<Record<string, unknown>> {
    const where: Record<string, unknown> = {};

    if (payload?.trashed !== undefined) {
      where.trashed = payload.trashed;
    } else {
      where.trashed = false;
    }

    if (payload?.hideMaster) {
      where.slug = { $ne: E_ROLE.MASTER };
    }

    if (payload?.search) {
      where.$or = [
        {
          name: { $regex: this.query.normalize(payload.search), $options: 'i' },
        },
        {
          description: {
            $regex: this.query.normalize(payload.search),
            $options: 'i',
          },
        },
      ];
    }

    return where;
  }

  private transform(entity: InstanceType<typeof Model>): IGroup {
    return {
      ...entity.toJSON({ flattenObjectIds: true }),
      _id: entity._id.toString(),
    };
  }

  async create(payload: UserGroupCreatePayload): Promise<IGroup> {
    const created = await Model.create(payload);
    const populated = await created.populate(this.populateOptions);
    return this.transform(populated);
  }

  async findById(_id: string, options?: FindOptions): Promise<IGroup | null> {
    const where: Record<string, unknown> = { _id };
    if (options?.trashed !== undefined) {
      where.trashed = options.trashed;
    }

    const group = await Model.findOne(where).populate(this.populateOptions);
    if (!group) return null;

    return this.transform(group);
  }

  async findBySlug(
    slug: string,
    options?: FindOptions,
  ): Promise<IGroup | null> {
    const where: Record<string, unknown> = { slug };
    if (options?.trashed !== undefined) {
      where.trashed = options.trashed;
    }

    const group = await Model.findOne(where).populate(this.populateOptions);
    if (!group) return null;

    return this.transform(group);
  }

  async findMany(payload?: UserGroupQueryPayload): Promise<IGroup[]> {
    const where = await this.buildWhereClause(payload);

    let skip: number | undefined;
    let take: number | undefined;

    if (payload?.page && payload?.perPage) {
      skip = (payload.page - 1) * payload.perPage;
      take = payload.perPage;
    }

    let sortOption: Record<string, 'asc' | 'desc'> = { name: 'asc' };
    if (payload?.sort && Object.keys(payload.sort).length > 0) {
      sortOption = payload.sort;
    }

    const groups = await Model.find(where)
      .populate(this.populateOptions)
      .sort(sortOption)
      .skip(skip ?? 0)
      .limit(take ?? 0);

    return groups.map((g) => this.transform(g));
  }

  async update({ _id, ...payload }: UserGroupUpdatePayload): Promise<IGroup> {
    const group = await Model.findOne({ _id });

    if (!group) throw new Error('UserGroup not found');

    group.set(payload);

    await group.save();

    const populated = await group.populate(this.populateOptions);

    return this.transform(populated);
  }

  async updateMany({
    _ids,
    filterTrashed,
    data,
  }: UserGroupUpdateManyPayload): Promise<number> {
    const where: Record<string, unknown> = { _id: { $in: _ids } };
    if (filterTrashed !== undefined) where.trashed = filterTrashed;

    const updateData: Record<string, unknown> = {};
    if (data.trashed !== undefined) updateData['trashed'] = data.trashed;
    if (data.trashedAt !== undefined) updateData['trashedAt'] = data.trashedAt;

    const result = await Model.updateMany(where, { $set: updateData });
    return result.modifiedCount;
  }

  async findManyTrashed(): Promise<IGroup[]> {
    const groups = await Model.find({ trashed: true }).populate(
      this.populateOptions,
    );
    return groups.map((g) => this.transform(g));
  }

  async delete(_id: string): Promise<void> {
    await Model.deleteOne({ _id });
  }

  async deleteMany(_ids: string[]): Promise<number> {
    const result = await Model.deleteMany({ _id: { $in: _ids } });
    return result.deletedCount;
  }

  async count(payload?: UserGroupQueryPayload): Promise<number> {
    const where = await this.buildWhereClause(payload);
    return Model.countDocuments(where);
  }
}
