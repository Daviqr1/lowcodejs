import { Service } from 'fastify-decorators';

import type { IField } from '@application/core/entity.core';
import type { FindOptions } from '@application/core/entity.core';
import { Field as Model } from '@application/model/field.model';
import { MongooseRepository } from '@application/repositories/mongoose-base.repository';
import { SearchContractService } from '@application/services/search/search-contract.service';

import type {
  FieldContractRepository,
  FieldCreatePayload,
  FieldQueryPayload,
  FieldUpdatePayload,
} from './field-contract.repository';

@Service()
export default class FieldMongooseRepository
  extends MongooseRepository<IField>
  implements FieldContractRepository
{
  constructor(private readonly search: SearchContractService) {
    super();
  }

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
        $regex: this.search.normalize(payload.search),
        $options: 'i',
      };
    }

    return where;
  }

  async create(payload: FieldCreatePayload): Promise<IField> {
    const created = await Model.create(payload);
    return this.transform(created);
  }

  async createMany(payloads: FieldCreatePayload[]): Promise<IField[]> {
    const created = await Model.insertMany(payloads);
    return created.map((entity) => this.transform(entity));
  }

  async findById(_id: string, options?: FindOptions): Promise<IField | null> {
    const where = this.trashedClause({ _id }, options);

    const field = await Model.findOne(where);
    if (!field) return null;

    return this.transform(field);
  }

  async findBySlug(
    slug: string,
    options?: FindOptions,
  ): Promise<IField | null> {
    const where = this.trashedClause({ slug }, options);

    const field = await Model.findOne(where);
    if (!field) return null;

    return this.transform(field);
  }

  async findMany(payload?: FieldQueryPayload): Promise<IField[]> {
    const where = this.buildWhereClause(payload);

    const { skip, limit } = this.paginate(payload);

    const fields = await Model.find(where)
      .sort({ name: 'asc' })
      .skip(skip)
      .limit(limit);

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
