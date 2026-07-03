/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { ITable } from '@application/core/entity.core';
import type { FindOptions } from '@application/core/entity.core';
import { Table as Model } from '@application/model/table.model';
import { QueryBuilderContractService } from '@application/services/table/query-builder-contract.service';
import { getDataConnection } from '@config/database.config';

function assertITable(value: Record<string, unknown>): asserts value is ITable {
  if (!value['_id'] && !value['slug']) {
    throw new Error('Invalid table object');
  }
}

import type {
  TableContractRepository,
  TableCreatePayload,
  TableQueryPayload,
  TableUpdateManyPayload,
  TableUpdatePayload,
} from './table-contract.repository';

@Service()
export default class TableMongooseRepository implements TableContractRepository {
  constructor(private readonly query: QueryBuilderContractService) {}

  private readonly populateOptions = [
    { path: 'logo' },
    { path: 'fields' },
    { path: 'owner' },
    { path: 'groups.fields' },
  ];

  private buildWhereClause(
    payload?: TableQueryPayload,
  ): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    if (payload?.trashed !== undefined) {
      where.trashed = payload.trashed;
    } else {
      where.trashed = false;
    }

    if (payload?._ids && payload._ids.length > 0) {
      where._id = { $in: payload._ids };
    }

    if (payload?.type) where.type = payload.type;
    if (payload?.owner?.length) {
      where['owner'] = { $in: payload.owner };
    }

    if (payload?.search) {
      where.name = {
        $regex: this.query.normalize(payload.search),
        $options: 'i',
      };
    }

    return where;
  }

  private transform(entity: InstanceType<typeof Model>): ITable {
    return {
      ...entity.toJSON({ flattenObjectIds: true }),
      _id: entity._id.toString(),
    };
  }

  async create(payload: TableCreatePayload): Promise<ITable> {
    const created = await Model.create(payload);
    const populated = await created.populate(this.populateOptions);
    return this.transform(populated);
  }

  async findById(_id: string, options?: FindOptions): Promise<ITable | null> {
    const where: Record<string, unknown> = { _id };
    if (options?.trashed !== undefined) {
      where.trashed = options.trashed;
    }

    const table = await Model.findOne(where).populate(this.populateOptions);
    if (!table) return null;

    return this.transform(table);
  }

  async findBySlug(
    slug: string,
    options?: FindOptions,
  ): Promise<ITable | null> {
    const where: Record<string, unknown> = { slug };
    if (options?.trashed !== undefined) {
      where.trashed = options.trashed;
    }

    const table = await Model.findOne(where).populate(this.populateOptions);
    if (!table) return null;

    return this.transform(table);
  }

  async findMany(payload?: TableQueryPayload): Promise<ITable[]> {
    const where = this.buildWhereClause(payload);

    let skip: number | undefined;
    let take: number | undefined;

    if (payload?.page && payload?.perPage) {
      skip = (payload.page - 1) * payload.perPage;
      take = payload.perPage;
    }

    let sortOption: Record<string, 'asc' | 'desc'> = { createdAt: 'desc' };
    if (payload?.sort && Object.keys(payload.sort).length > 0) {
      sortOption = payload.sort;
    }

    const hasOwnerSort = 'owner.name' in sortOption;

    if (hasOwnerSort) {
      const aggregationSort: Record<string, 1 | -1> = {};
      for (const [key, dir] of Object.entries(sortOption)) {
        let direction: 1 | -1 = -1;
        if (dir === 'asc') direction = 1;
        if (key === 'owner.name') aggregationSort['_ownerName'] = direction;
        if (key !== 'owner.name') aggregationSort[key] = direction;
      }

      const limitStages: Array<{ $limit: number }> = [];
      if (take) limitStages.push({ $limit: take });

      const docs = await Model.aggregate([
        { $match: where },
        {
          $lookup: {
            from: 'users',
            localField: 'owner',
            foreignField: '_id',
            as: '_ownerDoc',
          },
        },
        {
          $addFields: {
            _ownerName: { $arrayElemAt: ['$_ownerDoc.name', 0] },
          },
        },
        { $sort: aggregationSort },
        { $skip: skip ?? 0 },
        ...limitStages,
        { $project: { _ownerDoc: 0, _ownerName: 0 } },
      ]);

      const populated = await Model.populate(docs, this.populateOptions);
      return populated.map((doc): ITable => {
        let plain: Record<string, unknown> = { ...doc };
        if (typeof doc.toJSON === 'function') {
          plain = doc.toJSON({ flattenObjectIds: true });
        }
        let id = '';
        if (plain['_id']) id = String(plain['_id']);
        plain['_id'] = id;
        assertITable(plain);
        return plain;
      });
    }

    const tables = await Model.find(where)
      .populate(this.populateOptions)
      .sort(sortOption)
      .skip(skip ?? 0)
      .limit(take ?? 0);

    return tables.map((t) => this.transform(t));
  }

  async update({ _id, ...payload }: TableUpdatePayload): Promise<ITable> {
    const table = await Model.findOne({ _id });

    if (!table) throw new Error('Table not found');

    table.set(payload);

    await table.save();

    const fresh = await Model.findById(_id).populate(this.populateOptions);

    if (!fresh) throw new Error('Table not found after update');

    return this.transform(fresh);
  }

  async updateMany({
    _ids,
    type,
    filterTrashed,
    data,
  }: TableUpdateManyPayload): Promise<number> {
    const where: Record<string, unknown> = { _id: { $in: _ids } };
    if (type) where.type = type;
    if (filterTrashed !== undefined) where.trashed = filterTrashed;

    const updateData: Record<string, unknown> = {};
    if (data.style) updateData['style'] = data.style;
    if (data.trashed !== undefined) updateData['trashed'] = data.trashed;
    if (data.trashedAt !== undefined) updateData['trashedAt'] = data.trashedAt;

    const result = await Model.updateMany(where, { $set: updateData });
    return result.modifiedCount;
  }

  async delete(_id: string): Promise<void> {
    await Model.deleteOne({ _id });
  }

  async count(payload?: TableQueryPayload): Promise<number> {
    const where = this.buildWhereClause(payload);
    return Model.countDocuments(where);
  }

  async dropCollection(slug: string): Promise<void> {
    const conn = getDataConnection();
    const db = conn.db!;

    const collections = await db.listCollections({ name: slug }).toArray();
    if (collections.length > 0) {
      await db.dropCollection(slug);
    }

    if (conn.models[slug]) {
      conn.deleteModel(slug);
    }
  }

  async renameSlug(oldSlug: string, newSlug: string): Promise<void> {
    const conn = getDataConnection();
    const db = conn.db!;
    await db.renameCollection(oldSlug, newSlug);

    if (conn.models[oldSlug]) {
      conn.deleteModel(oldSlug);
    }
  }

  async findByFieldIds(fieldIds: string[]): Promise<ITable[]> {
    const tables = await Model.find({
      fields: { $in: fieldIds },
      trashed: { $ne: true },
    }).populate(this.populateOptions);

    return tables.map((t) => this.transform(t));
  }
}
