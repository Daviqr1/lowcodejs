/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import {
  E_STORAGE_MIGRATION_STATUS,
  type FindOptions,
  type IStorage,
  type TStorageLocation,
  type TStorageMigrationStatus,
} from '@application/core/entity.core';
import { Storage as Model } from '@application/model/storage.model';
import { QueryBuilderContractService } from '@application/services/table/query-builder-contract.service';

import type {
  StorageContractRepository,
  StorageCreatePayload,
  StorageLocationFindOptions,
  StorageQueryPayload,
  StorageUpdatePayload,
} from './storage-contract.repository';

@Service()
export default class StorageMongooseRepository implements StorageContractRepository {
  constructor(private readonly query: QueryBuilderContractService) {}

  private buildWhereClause(
    payload?: StorageQueryPayload,
  ): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    if (payload?.mimetype) where.mimetype = payload.mimetype;

    if (payload?.search) {
      where.originalName = {
        $regex: this.query.normalize(payload.search),
        $options: 'i',
      };
    }

    return where;
  }

  private transform(entity: InstanceType<typeof Model>): IStorage {
    return {
      ...entity.toJSON({ flattenObjectIds: true }),
      _id: entity._id.toString(),
    };
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
    const where: Record<string, unknown> = { _id };
    if (options?.trashed !== undefined) {
      where.trashed = options.trashed;
    }

    const storage = await Model.findOne(where);
    if (!storage) return null;

    return this.transform(storage);
  }

  async findByFilename(
    filename: string,
    options?: FindOptions,
  ): Promise<IStorage | null> {
    const where: Record<string, unknown> = { filename };
    if (options?.trashed !== undefined) {
      where.trashed = options.trashed;
    }

    const storage = await Model.findOne(where);
    if (!storage) return null;

    return this.transform(storage);
  }

  async findMany(payload?: StorageQueryPayload): Promise<IStorage[]> {
    const where = this.buildWhereClause(payload);

    let skip: number | undefined;
    let take: number | undefined;

    if (payload?.page && payload?.perPage) {
      skip = (payload.page - 1) * payload.perPage;
      take = payload.perPage;
    }

    const storages = await Model.find(where)
      .sort({ originalName: 'asc' })
      .skip(skip ?? 0)
      .limit(take ?? 0);

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
    let skip: number | undefined;
    let take: number | undefined;
    if (options?.page && options?.perPage) {
      skip = (options.page - 1) * options.perPage;
      take = options.perPage;
    }

    const storages = await Model.find({ location })
      .skip(skip ?? 0)
      .limit(take ?? 0);

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
    let skip: number | undefined;
    let take: number | undefined;
    if (options?.page && options?.perPage) {
      skip = (options.page - 1) * options.perPage;
      take = options.perPage;
    }

    const storages = await Model.find({ migration_status: status })
      .skip(skip ?? 0)
      .limit(take ?? 0);

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
