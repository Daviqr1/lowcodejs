import { beforeEach, describe, expect, it } from 'vitest';

import {
  E_STORAGE_LOCATION,
  E_STORAGE_MIGRATION_STATUS,
} from '@application/core/entity.core';
import SettingInMemoryRepository from '@application/repositories/setting/setting-in-memory.repository';
import StorageInMemoryRepository from '@application/repositories/storage/storage-in-memory.repository';
import InMemoryStorageMigrationQueueService from '@application/services/storage-migration/in-memory-storage-migration-queue.service';

import StorageMigrationCleanupUseCase from './cleanup.use-case';

let storageRepo: StorageInMemoryRepository;
let settingRepo: SettingInMemoryRepository;
let queueService: InMemoryStorageMigrationQueueService;
let sut: StorageMigrationCleanupUseCase;

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

describe('Storage Migration Cleanup Use Case', () => {
  beforeEach(async () => {
    storageRepo = new StorageInMemoryRepository();
    settingRepo = new SettingInMemoryRepository();
    queueService = new InMemoryStorageMigrationQueueService();
    sut = new StorageMigrationCleanupUseCase(
      storageRepo,
      settingRepo,
      queueService,
    );
    await settingRepo.update({ STORAGE_DRIVER: E_STORAGE_LOCATION.S3 });
  });

  it('retorna 400 quando confirm é false', async () => {
    const result = await sut.execute({ confirm: false });
    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(400);
    expect(result.value.cause).toBe('CONFIRM_REQUIRED');
  });

  it('retorna 409 quando há arquivos ainda no driver antigo', async () => {
    await seedFile(storageRepo, 'a.txt', E_STORAGE_LOCATION.LOCAL);
    await seedFile(storageRepo, 'b.txt', E_STORAGE_LOCATION.S3);

    const result = await sut.execute({ confirm: true });
    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(409);
    expect(result.value.cause).toBe('CLEANUP_NOT_READY');
  });

  it('retorna 409 quando há falhas pendentes', async () => {
    await seedFile(
      storageRepo,
      'a.txt',
      E_STORAGE_LOCATION.S3,
      E_STORAGE_MIGRATION_STATUS.FAILED,
    );

    const result = await sut.execute({ confirm: true });
    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(409);
    expect(result.value.cause).toBe('CLEANUP_NOT_READY');
  });

  it('enfileira job de cleanup quando 100% migrado', async () => {
    await seedFile(storageRepo, 'a.txt', E_STORAGE_LOCATION.S3);
    await seedFile(storageRepo, 'b.txt', E_STORAGE_LOCATION.S3);

    const result = await sut.execute({ confirm: true });
    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.queued_count).toBe(2);
    expect(queueService.jobs[0].type).toBe('cleanup');
  });

  it('retorna 409 quando job ativo existe', async () => {
    await seedFile(storageRepo, 'a.txt', E_STORAGE_LOCATION.S3);
    await queueService.enqueueCleanup({
      driver_to_clear: E_STORAGE_LOCATION.LOCAL,
      file_ids: [],
    });

    const result = await sut.execute({ confirm: true });
    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(409);
    expect(result.value.cause).toBe('MIGRATION_ALREADY_RUNNING');
  });
});
