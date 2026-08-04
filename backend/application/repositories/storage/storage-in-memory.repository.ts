import {
  E_STORAGE_LOCATION,
  E_STORAGE_MIGRATION_STATUS,
  type FindOptions,
  type IStorage,
  type TStorageLocation,
  type TStorageMigrationStatus,
} from '@application/core/entity.core';
import { InMemoryRepository } from '@application/repositories/in-memory-base.repository';

import type {
  StorageContractRepository,
  StorageCreatePayload,
  StorageLocationFindOptions,
  StorageQueryPayload,
  StorageUpdatePayload,
} from './storage-contract.repository';

export default class StorageInMemoryRepository
  extends InMemoryRepository
  implements StorageContractRepository
{
  items: IStorage[] = [];

  private buildBase(payload: StorageCreatePayload): IStorage {
    return {
      filename: payload.filename,
      mimetype: payload.mimetype,
      originalName: payload.originalName,
      size: payload.size,
      location: payload.location ?? E_STORAGE_LOCATION.LOCAL,
      migration_status:
        payload.migration_status ?? E_STORAGE_MIGRATION_STATUS.IDLE,
      _id: crypto.randomUUID(),
      url: `/storage/${payload.filename}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      trashedAt: null,
      trashed: false,
    };
  }

  async create(payload: StorageCreatePayload): Promise<IStorage> {
    const storage = this.buildBase(payload);
    this.items.push(storage);
    return storage;
  }

  async createMany(payload: StorageCreatePayload[]): Promise<IStorage[]> {
    const storages = payload.map((p) => this.buildBase(p));
    this.items.push(...storages);
    return storages;
  }

  async findById(_id: string, options?: FindOptions): Promise<IStorage | null> {
    this.checkError('findById');
    const item = this.items.find((i) => {
      if (i._id !== _id) return false;
      if (options?.trashed !== undefined) return i.trashed === options.trashed;
      return true;
    });
    return item ?? null;
  }

  async findByFilename(
    filename: string,
    options?: FindOptions,
  ): Promise<IStorage | null> {
    const item = this.items.find((i) => {
      if (i.filename !== filename) return false;
      if (options?.trashed !== undefined) return i.trashed === options.trashed;
      return true;
    });
    return item ?? null;
  }

  async findMany(payload?: StorageQueryPayload): Promise<IStorage[]> {
    let filtered = this.items;

    if (payload?.search) {
      const search = payload.search.toLowerCase();
      filtered = filtered.filter((s) =>
        s.originalName.toLowerCase().includes(search),
      );
    }

    if (payload?.mimetype) {
      filtered = filtered.filter((s) => s.mimetype === payload.mimetype);
    }

    filtered = filtered.sort((a, b) =>
      a.originalName.localeCompare(b.originalName),
    );

    if (payload?.page && payload?.perPage) {
      const start = (payload.page - 1) * payload.perPage;
      const end = start + payload.perPage;
      filtered = filtered.slice(start, end);
    }

    return filtered;
  }

  async update({ _id, ...payload }: StorageUpdatePayload): Promise<IStorage> {
    const storage = this.items.find((s) => s._id === _id);
    if (!storage) throw new Error('Storage not found');
    Object.assign(storage, payload, { updatedAt: new Date() });
    return storage;
  }

  async delete(_id: string): Promise<void> {
    const index = this.items.findIndex((s) => s._id === _id);
    if (index === -1) throw new Error('Storage not found');
    this.items.splice(index, 1);
  }

  async count(payload?: StorageQueryPayload): Promise<number> {
    const filtered = await this.findMany({
      ...payload,
      page: undefined,
      perPage: undefined,
    });
    return filtered.length;
  }

  async findByLocation(
    location: TStorageLocation,
    options?: StorageLocationFindOptions,
  ): Promise<IStorage[]> {
    let filtered = this.items.filter((s) => s.location === location);
    if (options?.page && options?.perPage) {
      const start = (options.page - 1) * options.perPage;
      const end = start + options.perPage;
      filtered = filtered.slice(start, end);
    }
    return filtered;
  }

  async countByLocation(location: TStorageLocation): Promise<number> {
    return this.items.filter((s) => s.location === location).length;
  }

  async countByMigrationStatus(
    status: TStorageMigrationStatus,
  ): Promise<number> {
    return this.items.filter((s) => s.migration_status === status).length;
  }

  async findByMigrationStatus(
    status: TStorageMigrationStatus,
    options?: StorageLocationFindOptions,
  ): Promise<IStorage[]> {
    let filtered = this.items.filter((s) => s.migration_status === status);
    if (options?.page && options?.perPage) {
      const start = (options.page - 1) * options.perPage;
      const end = start + options.perPage;
      filtered = filtered.slice(start, end);
    }
    return filtered;
  }

  async updateLocation(
    _id: string,
    location: TStorageLocation,
    migration_status: TStorageMigrationStatus,
  ): Promise<IStorage | null> {
    const storage = this.items.find((s) => s._id === _id);
    if (!storage) return null;
    storage.location = location;
    storage.migration_status = migration_status;
    storage.updatedAt = new Date();
    return storage;
  }

  async markInProgressAsFailed(): Promise<number> {
    let count = 0;
    for (const item of this.items) {
      if (item.migration_status === E_STORAGE_MIGRATION_STATUS.IN_PROGRESS) {
        item.migration_status = E_STORAGE_MIGRATION_STATUS.FAILED;
        count++;
      }
    }
    return count;
  }
}
