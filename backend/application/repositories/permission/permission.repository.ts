import { Service } from 'fastify-decorators';

import type { IPermission } from '@application/core/entity.core';
import type { FindOptions } from '@application/core/entity.core';
import { Permission as Model } from '@application/model/permission.model';
import { QueryBuilderContractService } from '@application/services/table/query-builder-contract.service';

import type {
  PermissionContractRepository,
  PermissionCreatePayload,
  PermissionQueryPayload,
  PermissionUpdatePayload,
} from './permission-contract.repository';

@Service()
export default class PermissionMongooseRepository implements PermissionContractRepository {
  constructor(private readonly query: QueryBuilderContractService) {}

  private buildWhereClause(
    payload?: PermissionQueryPayload,
  ): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    if (payload?.search) {
      where.name = {
        $regex: this.query.normalize(payload.search),
        $options: 'i',
      };
    }

    return where;
  }

  private transform(entity: InstanceType<typeof Model>): IPermission {
    return {
      ...entity.toJSON({ flattenObjectIds: true }),
      _id: entity._id.toString(),
    };
  }

  async create(payload: PermissionCreatePayload): Promise<IPermission> {
    const created = await Model.create(payload);
    return this.transform(created);
  }

  async findById(
    _id: string,
    options?: FindOptions,
  ): Promise<IPermission | null> {
    const where: Record<string, unknown> = { _id };
    if (options?.trashed !== undefined) {
      where.trashed = options.trashed;
    }

    const permission = await Model.findOne(where);
    if (!permission) return null;

    return this.transform(permission);
  }

  async findBySlug(
    slug: string,
    options?: FindOptions,
  ): Promise<IPermission | null> {
    const where: Record<string, unknown> = { slug };
    if (options?.trashed !== undefined) {
      where.trashed = options.trashed;
    }

    const permission = await Model.findOne(where);
    if (!permission) return null;

    return this.transform(permission);
  }

  async findMany(payload?: PermissionQueryPayload): Promise<IPermission[]> {
    const where = this.buildWhereClause(payload);

    let skip: number | undefined;
    let take: number | undefined;

    if (payload?.page && payload?.perPage) {
      skip = (payload.page - 1) * payload.perPage;
      take = payload.perPage;
    }

    const permissions = await Model.find(where)
      .sort({ name: 'asc' })
      .skip(skip ?? 0)
      .limit(take ?? 0);

    return permissions.map((p) => this.transform(p));
  }

  async update({
    _id,
    ...payload
  }: PermissionUpdatePayload): Promise<IPermission> {
    const permission = await Model.findOne({ _id });

    if (!permission) throw new Error('Permission not found');

    permission.set(payload);

    await permission.save();

    return this.transform(permission);
  }

  async delete(_id: string): Promise<void> {
    await Model.deleteOne({ _id });
  }

  async count(payload?: PermissionQueryPayload): Promise<number> {
    const where = this.buildWhereClause(payload);
    return Model.countDocuments(where);
  }
}
