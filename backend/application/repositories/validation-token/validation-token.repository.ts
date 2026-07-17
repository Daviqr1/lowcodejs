import { Service } from 'fastify-decorators';

import type { IValidationToken } from '@application/core/entity.core';
import type { FindOptions } from '@application/core/entity.core';
import { ValidationToken as Model } from '@application/model/validation-token.model';

import type {
  ValidationTokenContractRepository,
  ValidationTokenCreatePayload,
  ValidationTokenQueryPayload,
  ValidationTokenUpdatePayload,
} from './validation-token-contract.repository';

@Service()
export default class ValidationTokenMongooseRepository implements ValidationTokenContractRepository {
  private readonly populateOptions = [
    {
      path: 'user',
      populate: { path: 'group', populate: { path: 'permissions' } },
    },
  ];

  private buildWhereClause(
    payload?: ValidationTokenQueryPayload,
  ): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    if (payload?.user) where.user = payload.user;
    if (payload?.status) where.status = payload.status;

    return where;
  }

  private transform(entity: InstanceType<typeof Model>): IValidationToken {
    return {
      ...entity.toJSON({ flattenObjectIds: true }),
      _id: entity._id.toString(),
    };
  }

  async create(
    payload: ValidationTokenCreatePayload,
  ): Promise<IValidationToken> {
    const created = await Model.create(payload);
    const populated = await created.populate(this.populateOptions);
    return this.transform(populated);
  }

  async findById(
    _id: string,
    options?: FindOptions,
  ): Promise<IValidationToken | null> {
    const where: Record<string, unknown> = { _id };
    if (options?.trashed !== undefined) {
      where.trashed = options.trashed;
    }

    const token = await Model.findOne(where).populate(this.populateOptions);
    if (!token) return null;

    return this.transform(token);
  }

  async findByCode(
    code: string,
    options?: FindOptions,
  ): Promise<IValidationToken | null> {
    const where: Record<string, unknown> = { code };
    if (options?.trashed !== undefined) {
      where.trashed = options.trashed;
    }

    const token = await Model.findOne(where).populate(this.populateOptions);
    if (!token) return null;

    return this.transform(token);
  }

  async findMany(
    payload?: ValidationTokenQueryPayload,
  ): Promise<IValidationToken[]> {
    const where = this.buildWhereClause(payload);

    let skip: number | undefined;
    let take: number | undefined;

    if (payload?.page && payload?.perPage) {
      skip = (payload.page - 1) * payload.perPage;
      take = payload.perPage;
    }

    const tokens = await Model.find(where)
      .populate(this.populateOptions)
      .sort({ createdAt: 'desc' })
      .skip(skip ?? 0)
      .limit(take ?? 0);

    return tokens.map((t) => this.transform(t));
  }

  async update({
    _id,
    ...payload
  }: ValidationTokenUpdatePayload): Promise<IValidationToken> {
    const token = await Model.findOne({ _id });

    if (!token) throw new Error('ValidationToken not found');

    token.set(payload);

    await token.save();

    const populated = await token.populate(this.populateOptions);

    return this.transform(populated);
  }

  async delete(_id: string): Promise<void> {
    await Model.deleteOne({ _id });
  }

  async count(payload?: ValidationTokenQueryPayload): Promise<number> {
    const where = this.buildWhereClause(payload);
    return Model.countDocuments(where);
  }
}
