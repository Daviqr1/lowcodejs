/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import { E_ROLE, type IUser } from '@application/core/entity.core';
import type { FindOptions } from '@application/core/entity.core';
import { User as Model } from '@application/model/user.model';
import { QueryBuilderContractService } from '@application/services/table/query-builder-contract.service';

import type {
  UserContractRepository,
  UserCreatePayload,
  UserQueryPayload,
  UserUpdateManyPayload,
  UserUpdatePayload,
} from './user-contract.repository';

@Service()
export default class UserMongooseRepository implements UserContractRepository {
  constructor(private readonly query: QueryBuilderContractService) {}

  private readonly populateOptions = [
    { path: 'group', populate: { path: 'permissions' } },
  ];

  private async buildWhereClause(
    payload?: UserQueryPayload,
  ): Promise<Record<string, unknown>> {
    const where: Record<string, unknown> = {};

    // Filtro por trashed
    if (payload?.trashed !== undefined) {
      where.trashed = payload.trashed;
    } else {
      where.trashed = false;
    }

    // Filtro por múltiplos IDs
    if (payload?._ids && payload._ids.length > 0) {
      where._id = { $in: payload._ids };
    }

    // Filtro por status
    if (payload?.status) {
      where.status = payload.status;
    }

    // Filtro por grupo
    if (payload?.group) {
      where.group = payload.group;
    }

    // Contexto admin: o caller declara `role=ADMINISTRATOR` e o JWT
    // confirma. Só aí aplicamos a regra "esconder MASTER" — em comboboxes
    // (que não passam role) todos os usuários elegíveis aparecem.
    if (
      payload?.role === E_ROLE.ADMINISTRATOR &&
      payload?.user?.role === E_ROLE.ADMINISTRATOR
    ) {
      const UserGroupModel = Model.db.model('UserGroup');
      const masterGroup = await UserGroupModel.findOne({ slug: E_ROLE.MASTER });

      if (masterGroup) {
        where.group = { $ne: masterGroup._id.toString() };
      }
    }

    if (payload?.search) {
      where.$or = [
        {
          name: { $regex: this.query.normalize(payload.search), $options: 'i' },
        },
        {
          email: {
            $regex: this.query.normalize(payload.search),
            $options: 'i',
          },
        },
      ];
    }

    return where;
  }

  private transform(entity: InstanceType<typeof Model>): IUser {
    return {
      ...entity.toJSON({ flattenObjectIds: true }),
      _id: entity._id.toString(),
    };
  }

  async create(payload: UserCreatePayload): Promise<IUser> {
    const created = await Model.create(payload);
    const populated = await created.populate(this.populateOptions);
    return this.transform(populated);
  }

  async findById(_id: string, options?: FindOptions): Promise<IUser | null> {
    const where: Record<string, unknown> = { _id };
    if (options?.trashed !== undefined) {
      where.trashed = options.trashed;
    }

    const user = await Model.findOne(where).populate(this.populateOptions);
    if (!user) return null;

    return this.transform(user);
  }

  async findByEmail(
    email: string,
    options?: FindOptions,
  ): Promise<IUser | null> {
    const where: Record<string, unknown> = { email };
    if (options?.trashed !== undefined) {
      where.trashed = options.trashed;
    }

    const user = await Model.findOne(where).populate(this.populateOptions);
    if (!user) return null;

    return this.transform(user);
  }

  async findMany(payload?: UserQueryPayload): Promise<IUser[]> {
    const where = await this.buildWhereClause(payload);

    let skip: number | undefined;
    let take: number | undefined;

    if (payload?.page && payload?.perPage) {
      skip = (payload.page - 1) * payload.perPage;
      take = payload.perPage;
    }

    const sortOption =
      payload?.sort && Object.keys(payload.sort).length > 0
        ? payload.sort
        : { name: 'asc' as const };

    const hasGroupSort = sortOption && 'group.name' in sortOption;

    if (hasGroupSort) {
      const aggregationSort: Record<string, 1 | -1> = {};
      for (const [key, dir] of Object.entries(sortOption)) {
        if (key === 'group.name') {
          aggregationSort['_groupName'] = dir === 'asc' ? 1 : -1;
        } else {
          aggregationSort[key] = dir === 'asc' ? 1 : -1;
        }
      }

      const docs = await Model.aggregate([
        { $match: where },
        {
          $lookup: {
            from: 'usergroups',
            localField: 'group',
            foreignField: '_id',
            as: '_groupDoc',
          },
        },
        {
          $addFields: {
            _groupName: { $arrayElemAt: ['$_groupDoc.name', 0] },
          },
        },
        { $sort: aggregationSort },
        { $skip: skip ?? 0 },
        ...(take ? [{ $limit: take }] : []),
        { $project: { _groupDoc: 0, _groupName: 0 } },
      ]);

      const populated = await Model.populate(docs, this.populateOptions);
      return populated.map((doc: any) => ({
        ...doc,
        _id: doc._id.toString(),
      }));
    }

    const users = await Model.find(where)
      .populate(this.populateOptions)
      .sort(sortOption)
      .skip(skip ?? 0)
      .limit(take ?? 0);

    return users.map((u) => this.transform(u));
  }

  async update({ _id, ...payload }: UserUpdatePayload): Promise<IUser> {
    const user = await Model.findOne({ _id });

    if (!user) throw new Error('User not found');

    user.set(payload);

    await user.save();

    const populated = await user.populate(this.populateOptions);

    return this.transform(populated);
  }

  async updateMany({
    _ids,
    filterTrashed,
    data,
  }: UserUpdateManyPayload): Promise<number> {
    const where: Record<string, unknown> = { _id: { $in: _ids } };
    if (filterTrashed !== undefined) where.trashed = filterTrashed;

    const updateData: Record<string, unknown> = {};
    if (data.trashed !== undefined) updateData['trashed'] = data.trashed;
    if (data.trashedAt !== undefined) updateData['trashedAt'] = data.trashedAt;
    if (data.status !== undefined) updateData['status'] = data.status;
    if (data.group !== undefined) updateData['group'] = data.group;

    const result = await Model.updateMany(where, { $set: updateData });
    return result.modifiedCount;
  }

  async findManyTrashed(): Promise<IUser[]> {
    const users = await Model.find({ trashed: true }).populate(
      this.populateOptions,
    );
    return users.map((u) => this.transform(u));
  }

  async delete(_id: string): Promise<void> {
    await Model.deleteOne({ _id });
  }

  async deleteMany(_ids: string[]): Promise<number> {
    const result = await Model.deleteMany({ _id: { $in: _ids } });
    return result.deletedCount;
  }

  async count(payload?: UserQueryPayload): Promise<number> {
    const where = await this.buildWhereClause(payload);
    return Model.countDocuments(where);
  }
}
