import { Service } from 'fastify-decorators';

import type { IPermission } from '@application/core/entity.core';
import type { FindOptions } from '@application/core/entity.core';
import { Permission as Model } from '@application/model/permission.model';
import { MongooseRepository } from '@application/repositories/mongoose-base.repository';
import { SearchContractService } from '@application/services/search/search-contract.service';

import type {
  PermissionContractRepository,
  PermissionCreatePayload,
  PermissionQueryPayload,
  PermissionUpdatePayload,
} from './permission-contract.repository';

@Service()
export default class PermissionMongooseRepository
  extends MongooseRepository<IPermission>
  implements PermissionContractRepository
{
  constructor(private readonly search: SearchContractService) {
    super();
  }

  private buildWhereClause(
    payload?: PermissionQueryPayload,
  ): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    if (payload?.search) {
      where.name = {
        $regex: this.search.normalize(payload.search),
        $options: 'i',
      };
    }

    return where;
  }

  async create(payload: PermissionCreatePayload): Promise<IPermission> {
    const created = await Model.create(payload);
    return this.transform(created);
  }

  async findById(
    _id: string,
    options?: FindOptions,
  ): Promise<IPermission | null> {
    const permission = await Model.findOne(
      this.trashedClause({ _id }, options, false),
    );
    if (!permission) return null;

    return this.transform(permission);
  }

  async findBySlug(
    slug: string,
    options?: FindOptions,
  ): Promise<IPermission | null> {
    const permission = await Model.findOne(
      this.trashedClause({ slug }, options, false),
    );
    if (!permission) return null;

    return this.transform(permission);
  }

  async findMany(payload?: PermissionQueryPayload): Promise<IPermission[]> {
    const { skip, limit } = this.paginate(payload);

    const permissions = await Model.find(this.buildWhereClause(payload))
      .sort({ name: 'asc' })
      .skip(skip)
      .limit(limit);

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
    return Model.countDocuments(this.buildWhereClause(payload));
  }
}
