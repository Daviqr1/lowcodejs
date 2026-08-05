import { beforeEach, describe, expect, it } from 'vitest';

import {
  E_STORAGE_LOCATION,
  E_STORAGE_MIGRATION_STATUS,
} from '@application/core/entity.core';
import SettingInMemoryRepository from '@application/repositories/setting/setting-in-memory.repository';
import StorageInMemoryRepository from '@application/repositories/storage/storage-in-memory.repository';
import InMemoryStorageMigrationQueueService from '@application/services/storage-migration/in-memory-storage-migration-queue.service';

import StorageMigrationStatusUseCase from './status.use-case';

let storageRepo: StorageInMemoryRepository;
let settingRepo: SettingInMemoryRepository;
let queueService: InMemoryStorageMigrationQueueService;
let sut: StorageMigrationStatusUseCase;

async function seedFile(
  repo: StorageInMemoryRepository,
  filename: string,
  location: 'local' | 's3',
  status: 'idle' | 'pending' | 'in_progress' | 'failed' = 'idle',
): Promise<void> {
  await repo.create({
    filename,
    mimetype: 'application/octet-stream',
    originalName: filename,
    size: 100,
    location,
    migration_status: status,
  });
}

describe('Storage Migration Status Use Case', () => {
  beforeEach(() => {
    storageRepo = new StorageInMemoryRepository();
    settingRepo = new SettingInMemoryRepository();
    queueService = new InMemoryStorageMigrationQueueService();
    sut = new StorageMigrationStatusUseCase(
      storageRepo,
      settingRepo,
      queueService,
    );
  });

  it('retorna contagens zeradas quando não há arquivos', async () => {
    const result = await sut.execute();
    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.total_files).toBe(0);
    expect(result.value.by_location.local).toBe(0);
    expect(result.value.by_location.s3).toBe(0);
    expect(result.value.can_cleanup).toBe(false);
  });

  it('detecta arquivos pendentes no driver antigo', async () => {
    await settingRepo.update({ STORAGE_DRIVER: E_STORAGE_LOCATION.S3 });
    await seedFile(storageRepo, 'a.txt', E_STORAGE_LOCATION.LOCAL);
    await seedFile(storageRepo, 'b.txt', E_STORAGE_LOCATION.LOCAL);
    await seedFile(storageRepo, 'c.txt', E_STORAGE_LOCATION.S3);

    const result = await sut.execute();
    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.current_driver).toBe(E_STORAGE_LOCATION.S3);
    expect(result.value.previous_driver).toBe(E_STORAGE_LOCATION.LOCAL);
    expect(result.value.total_files).toBe(3);
    expect(result.value.by_location.local).toBe(2);
    expect(result.value.by_location.s3).toBe(1);
    expect(result.value.can_cleanup).toBe(false);
  });

  it('habilita can_cleanup quando 100% migrado e zero falhas', async () => {
    await settingRepo.update({ STORAGE_DRIVER: E_STORAGE_LOCATION.S3 });
    await seedFile(storageRepo, 'a.txt', E_STORAGE_LOCATION.S3);
    await seedFile(storageRepo, 'b.txt', E_STORAGE_LOCATION.S3);

    const result = await sut.execute();
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.can_cleanup).toBe(true);
  });

  it('bloqueia can_cleanup quando há falhas', async () => {
    await settingRepo.update({ STORAGE_DRIVER: E_STORAGE_LOCATION.S3 });
    await seedFile(
      storageRepo,
      'a.txt',
      E_STORAGE_LOCATION.S3,
      E_STORAGE_MIGRATION_STATUS.FAILED,
    );

    const result = await sut.execute();
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.by_status.failed).toBe(1);
    expect(result.value.can_cleanup).toBe(false);
  });

  it('reflete migration_in_progress quando há job ativo', async () => {
    await queueService.enqueueMigration({
      source_driver: E_STORAGE_LOCATION.LOCAL,
      target_driver: E_STORAGE_LOCATION.S3,
      file_ids: [],
      concurrency: 5,
    });
    const result = await sut.execute();
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.migration_in_progress).toBe(true);
    expect(result.value.active_job_id).toBeTruthy();
  });
});
