import { Service } from 'fastify-decorators';

import {
  E_STORAGE_MIGRATION_STATUS,
  type FindOptions,
  type IStorage,
  type TStorageLocation,
  type TStorageMigrationStatus,
} from '@application/core/entity.core';
import { Storage as Model } from '@application/model/storage.model';
import { MongooseRepository } from '@application/repositories/mongoose-base.repository';
import { SearchContractService } from '@application/services/search/search-contract.service';

import type {
  StorageContractRepository,
  StorageCreatePayload,
  StorageLocationFindOptions,
  StorageQueryPayload,
  StorageUpdatePayload,
} from './storage-contract.repository';

@Service()
export default class StorageMongooseRepository
  extends MongooseRepository<IStorage>
  implements StorageContractRepository
{
  constructor(private readonly search: SearchContractService) {
    super();
  }

  private buildWhereClause(
    payload?: StorageQueryPayload,
  ): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    if (payload?.mimetype) where.mimetype = payload.mimetype;

    if (payload?.search) {
      where.originalName = {
        $regex: this.search.normalize(payload.search),
        $options: 'i',
      };
    }

    return where;
  }

  async create(payload: StorageCreatePayload): Promise<IStorage> {
    const created = await Model.create(payload);
    return this.transform(created);
  }

  async createMany(payload: StorageCreatePayload[]): Promise<IStorage[]> {
    // `Model.create(array)` devolve documentos hidratados (InstanceType), ao
    // contrário de `insertMany` (MergeType, com `location` opcional) — assim
    // `transform` recebe o tipo certo sem asserção.
    const storages = await Model.create(payload);
    return storages.map((s) => this.transform(s));
  }

  async findById(_id: string, options?: FindOptions): Promise<IStorage | null> {
    const where = this.trashedClause({ _id }, options, false);

    const storage = await Model.findOne(where);
    if (!storage) return null;

    return this.transform(storage);
  }

  async findByFilename(
    filename: string,
    options?: FindOptions,
  ): Promise<IStorage | null> {
    const where = this.trashedClause({ filename }, options, false);

    const storage = await Model.findOne(where);
    if (!storage) return null;

    return this.transform(storage);
  }

  async findMany(payload?: StorageQueryPayload): Promise<IStorage[]> {
    const where = this.buildWhereClause(payload);

    const { skip, limit } = this.paginate(payload);

    const storages = await Model.find(where)
      .sort({ originalName: 'asc' })
      .skip(skip)
      .limit(limit);

    return storages.map((s) => this.transform(s));
  }

  async update({ _id, ...payload }: StorageUpdatePayload): Promise<IStorage> {
    const storage = await Model.findOne({ _id });

    if (!storage) throw new Error('Storage not found');

    storage.set(payload);

    await storage.save();

    return this.transform(storage);
  }

  async delete(_id: string): Promise<void> {
    await Model.deleteOne({ _id });
  }

  async count(payload?: StorageQueryPayload): Promise<number> {
    const where = this.buildWhereClause(payload);
    return Model.countDocuments(where);
  }

  async findByLocation(
    location: TStorageLocation,
    options?: StorageLocationFindOptions,
  ): Promise<IStorage[]> {
    const { skip, limit } = this.paginate(options);

    const storages = await Model.find({ location }).skip(skip).limit(limit);

    return storages.map((s) => this.transform(s));
  }

  async countByLocation(location: TStorageLocation): Promise<number> {
    return Model.countDocuments({ location });
  }

  async countByMigrationStatus(
    status: TStorageMigrationStatus,
  ): Promise<number> {
    return Model.countDocuments({ migration_status: status });
  }

  async findByMigrationStatus(
    status: TStorageMigrationStatus,
    options?: StorageLocationFindOptions,
  ): Promise<IStorage[]> {
    const { skip, limit } = this.paginate(options);

    const storages = await Model.find({ migration_status: status })
      .skip(skip)
      .limit(limit);

    return storages.map((s) => this.transform(s));
  }

  async updateLocation(
    _id: string,
    location: TStorageLocation,
    migration_status: TStorageMigrationStatus,
  ): Promise<IStorage | null> {
    const storage = await Model.findOneAndUpdate(
      { _id },
      { $set: { location, migration_status } },
      { new: true },
    );
    if (!storage) return null;
    return this.transform(storage);
  }

  async markInProgressAsFailed(): Promise<number> {
    const result = await Model.updateMany(
      { migration_status: E_STORAGE_MIGRATION_STATUS.IN_PROGRESS },
      { $set: { migration_status: E_STORAGE_MIGRATION_STATUS.FAILED } },
    );
    return result.modifiedCount;
  }
}
