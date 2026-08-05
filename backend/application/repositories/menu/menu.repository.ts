import { Service } from 'fastify-decorators';
import mongoose from 'mongoose';

import type { IMenu } from '@application/core/entity.core';
import type { FindOptions } from '@application/core/entity.core';
import { Menu as Model } from '@application/model/menu.model';
import { MongooseRepository } from '@application/repositories/mongoose-base.repository';
import { SearchContractService } from '@application/services/search/search-contract.service';

import type {
  MenuContractRepository,
  MenuCreatePayload,
  MenuQueryPayload,
  MenuUpdateManyPayload,
  MenuUpdatePayload,
} from './menu-contract.repository';

@Service()
export default class MenuMongooseRepository
  extends MongooseRepository<IMenu>
  implements MenuContractRepository
{
  constructor(private readonly search: SearchContractService) {
    super();
  }

  private readonly populateOptions = [
    { path: 'table' },
    { path: 'parent' },
    { path: 'owner' },
  ];

  private buildWhereClause(
    payload?: MenuQueryPayload,
  ): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    if (payload?.trashed !== undefined) {
      where.trashed = payload.trashed;
    } else {
      where.trashed = false;
    }

    if (payload?.parent !== undefined) {
      where.parent = payload.parent;
    }

    if (payload?.search) {
      where.$or = [
        {
          name: {
            $regex: this.search.normalize(payload.search),
            $options: 'i',
          },
        },
        {
          slug: {
            $regex: this.search.normalize(payload.search),
            $options: 'i',
          },
        },
      ];
    }

    return where;
  }

  // table/parent sao ids (string) no contrato IMenu e em todos os schemas, mas
  // o populate os entrega como documento. Normaliza de volta para id para nao
  // serializar "[object Object]" nem quebrar o $in do loadLinkedTables. owner
  // permanece populado (paginacao exibe nome/email).
  private toId(ref: unknown): string | null {
    if (!ref) return null;
    if (typeof ref === 'string') return ref;
    if (typeof ref === 'object' && ref !== null && '_id' in ref) {
      return String(ref._id);
    }
    return String(ref);
  }

  // Sobrescreve a base so para achatar as duas refs populadas em id.
  protected transform(entity: InstanceType<typeof Model>): IMenu {
    const json = super.transform(entity);
    return {
      ...json,
      table: this.toId(json.table),
      parent: this.toId(json.parent),
    };
  }

  async create(payload: MenuCreatePayload): Promise<IMenu> {
    const created = await Model.create(payload);
    const populated = await created.populate(this.populateOptions);
    return this.transform(populated);
  }

  async findById(_id: string, options?: FindOptions): Promise<IMenu | null> {
    const where = this.trashedClause({ _id }, options, false);

    const menu = await Model.findOne(where).populate(this.populateOptions);
    if (!menu) return null;

    return this.transform(menu);
  }

  async findBySlug(slug: string, options?: FindOptions): Promise<IMenu | null> {
    const where = this.trashedClause({ slug }, options, false);

    const menu = await Model.findOne(where).populate(this.populateOptions);
    if (!menu) return null;

    return this.transform(menu);
  }

  async findMany(payload?: MenuQueryPayload): Promise<IMenu[]> {
    const where = this.buildWhereClause(payload);

    const { skip, limit } = this.paginate(payload);

    let sortOption: Record<string, 'asc' | 'desc'> = {
      order: 'asc',
      name: 'asc',
    };
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
      if (limit) limitStages.push({ $limit: limit });

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
        { $skip: skip },
        ...limitStages,
        { $project: { _ownerDoc: 0, _ownerName: 0 } },
      ]);

      const populated = await Model.populate(docs, this.populateOptions);
      return populated.map((doc) => ({
        ...doc,
        _id: doc._id.toString(),
        table: this.toId(doc.table),
        parent: this.toId(doc.parent),
      }));
    }

    const menus = await Model.find(where)
      .populate(this.populateOptions)
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    return menus.map((m) => this.transform(m));
  }

  async update({ _id, ...payload }: MenuUpdatePayload): Promise<IMenu> {
    const menu = await Model.findOne({ _id });

    if (!menu) throw new Error('Menu not found');

    menu.set(payload);

    await menu.save();

    const populated = await menu.populate(this.populateOptions);

    return this.transform(populated);
  }

  async updateMany({
    _ids,
    filterTrashed,
    data,
  }: MenuUpdateManyPayload): Promise<number> {
    const where: Record<string, unknown> = { _id: { $in: _ids } };
    if (filterTrashed !== undefined) where.trashed = filterTrashed;

    const updateData: Record<string, unknown> = {};
    if (data.trashed !== undefined) updateData['trashed'] = data.trashed;
    if (data.trashedAt !== undefined) updateData['trashedAt'] = data.trashedAt;
    if (data.isInitial !== undefined) updateData['isInitial'] = data.isInitial;

    const result = await Model.updateMany(where, { $set: updateData });
    return result.modifiedCount;
  }

  async findManyTrashed(): Promise<IMenu[]> {
    const menus = await Model.find({ trashed: true }).populate(
      this.populateOptions,
    );
    return menus.map((m) => this.transform(m));
  }

  async delete(_id: string): Promise<void> {
    await Model.deleteOne({ _id });
  }

  async deleteMany(_ids: string[]): Promise<number> {
    const result = await Model.deleteMany({ _id: { $in: _ids } });
    return result.deletedCount;
  }

  async count(payload?: MenuQueryPayload): Promise<number> {
    const where = this.buildWhereClause(payload);
    return Model.countDocuments(where);
  }

  async findDescendantIds(menuId: string): Promise<string[]> {
    const result = await Model.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(menuId) } },
      {
        $graphLookup: {
          from: 'menus',
          startWith: '$_id',
          connectFromField: '_id',
          connectToField: 'parent',
          as: 'descendants',
        },
      },
      { $project: { descendants: '$descendants._id' } },
    ]);

    if (!result.length || !result[0].descendants) return [];

    return result[0].descendants.map((id: mongoose.Types.ObjectId) =>
      id.toString(),
    );
  }

  async setOnlyInitial(_id: string): Promise<void> {
    await Model.updateMany({ isInitial: true }, { $set: { isInitial: false } });
    await Model.updateOne({ _id }, { $set: { isInitial: true } });
  }
}
