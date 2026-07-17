import type {
  FindOptions,
  IStorage,
  Merge,
  TStorageLocation,
  TStorageMigrationStatus,
} from '@application/core/entity.core';

export type StorageCreatePayload = Merge<
  Pick<IStorage, 'filename' | 'mimetype' | 'originalName' | 'size'>,
  Partial<Pick<IStorage, 'location' | 'migration_status'>>
>;

export type StorageUpdatePayload = Merge<
  Pick<IStorage, '_id'>,
  Partial<StorageCreatePayload>
>;

export type StorageQueryPayload = {
  page?: number;
  perPage?: number;
  search?: string;
  mimetype?: string;
};

export type StorageLocationFindOptions = {
  page?: number;
  perPage?: number;
};

export abstract class StorageContractRepository {
  abstract create(payload: StorageCreatePayload): Promise<IStorage>;
  abstract createMany(payload: StorageCreatePayload[]): Promise<IStorage[]>;
  abstract findById(
    _id: string,
    options?: FindOptions,
  ): Promise<IStorage | null>;
  abstract findByFilename(
    filename: string,
    options?: FindOptions,
  ): Promise<IStorage | null>;
  abstract findMany(payload?: StorageQueryPayload): Promise<IStorage[]>;
  abstract update(payload: StorageUpdatePayload): Promise<IStorage>;
  abstract delete(_id: string): Promise<void>;
  abstract count(payload?: StorageQueryPayload): Promise<number>;

  // Migration helpers
  abstract findByLocation(
    location: TStorageLocation,
    options?: StorageLocationFindOptions,
  ): Promise<IStorage[]>;
  abstract countByLocation(location: TStorageLocation): Promise<number>;
  abstract countByMigrationStatus(
    status: TStorageMigrationStatus,
  ): Promise<number>;
  abstract findByMigrationStatus(
    status: TStorageMigrationStatus,
    options?: StorageLocationFindOptions,
  ): Promise<IStorage[]>;
  abstract updateLocation(
    _id: string,
    location: TStorageLocation,
    migration_status: TStorageMigrationStatus,
  ): Promise<IStorage | null>;
  abstract markInProgressAsFailed(): Promise<number>;
}
