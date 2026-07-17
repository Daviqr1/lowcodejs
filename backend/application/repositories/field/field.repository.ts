import { Service } from 'fastify-decorators';

import type { IField } from '@application/core/entity.core';
import type { FindOptions } from '@application/core/entity.core';
import { Field as Model } from '@application/model/field.model';
import { SearchNormalizer } from '@application/services/table/search-normalizer';

import type {
  FieldContractRepository,
  FieldCreatePayload,
  FieldQueryPayload,
  FieldUpdatePayload,
} from './field-contract.repository';

@Service()
export default class FieldMongooseRepository implements FieldContractRepository {
  private buildWhereClause(
    payload?: FieldQueryPayload,
  ): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    if (payload?.type) where.type = payload.type;

    if (payload?._ids && payload._ids.length > 0) {
      where._id = { $in: payload._ids };
    }

    if (payload?.search) {
      where.name = {
        $regex: SearchNormalizer.normalize(payload.search),
        $options: 'i',
      };
    }

    return where;
  }

  private transform(entity: InstanceType<typeof Model>): IField {
    return {
      ...entity.toJSON({ flattenObjectIds: true }),
      _id: entity._id.toString(),
    };
  }

  async create(payload: FieldCreatePayload): Promise<IField> {
    const created = await Model.create(payload);
    return this.transform(created);
  }

  async createMany(payloads: FieldCreatePayload[]): Promise<IField[]> {
    const created = await Model.insertMany(payloads);
    return created.map(this.transform);
  }

  async findById(_id: string, options?: FindOptions): Promise<IField | null> {
    const where: Record<string, unknown> = { _id };
    if (options?.trashed !== undefined) {
      where.trashed = options.trashed;
    }

    const field = await Model.findOne(where);
    if (!field) return null;

    return this.transform(field);
  }

  async findBySlug(
    slug: string,
    options?: FindOptions,
  ): Promise<IField | null> {
    const where: Record<string, unknown> = { slug };
    if (options?.trashed !== undefined) {
      where.trashed = options.trashed;
    }

    const field = await Model.findOne(where);
    if (!field) return null;

    return this.transform(field);
  }

  async findMany(payload?: FieldQueryPayload): Promise<IField[]> {
    const where = this.buildWhereClause(payload);

    let skip: number | undefined;
    let take: number | undefined;

    if (payload?.page && payload?.perPage) {
      skip = (payload.page - 1) * payload.perPage;
      take = payload.perPage;
    }

    const fields = await Model.find(where)
      .sort({ name: 'asc' })
      .skip(skip ?? 0)
      .limit(take ?? 0);

    return fields.map((f) => this.transform(f));
  }

  async update({ _id, ...payload }: FieldUpdatePayload): Promise<IField> {
    const field = await Model.findOneAndUpdate(
      { _id },
      { $set: payload },
      { new: true, runValidators: true },
    );

    if (!field) throw new Error('Field not found');

    return this.transform(field);
  }

  async delete(_id: string): Promise<void> {
    await Model.deleteOne({ _id });
  }

  async deleteMany(_ids: string[]): Promise<void> {
    await Model.deleteMany({ _id: { $in: _ids } });
  }

  async count(payload?: FieldQueryPayload): Promise<number> {
    const where = this.buildWhereClause(payload);
    return Model.countDocuments(where);
  }

  async updateRelationshipTableSlug(
    tableId: string,
    newSlug: string,
  ): Promise<void> {
    await Model.updateMany(
      { 'relationship.table._id': tableId },
      { $set: { 'relationship.table.slug': newSlug } },
    );
  }

  async findByRelationshipTableId(tableId: string): Promise<IField[]> {
    const fields = await Model.find({
      'relationship.table._id': tableId,
      trashed: { $ne: true },
    });

    return fields.map((f) => this.transform(f));
  }
}
