import { beforeEach, describe, expect, it } from 'vitest';

import {
  E_STORAGE_LOCATION,
  E_STORAGE_MIGRATION_STATUS,
} from '@application/core/entity.core';
import SettingInMemoryRepository from '@application/repositories/setting/setting-in-memory.repository';
import StorageInMemoryRepository from '@application/repositories/storage/storage-in-memory.repository';
import InMemoryStorageMigrationQueueService from '@application/services/storage-migration/in-memory-storage-migration-queue.service';

import StorageMigrationStartUseCase from './start.use-case';

let storageRepo: StorageInMemoryRepository;
let settingRepo: SettingInMemoryRepository;
let queueService: InMemoryStorageMigrationQueueService;
let sut: StorageMigrationStartUseCase;

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

describe('Storage Migration Start Use Case', () => {
  beforeEach(async () => {
    storageRepo = new StorageInMemoryRepository();
    settingRepo = new SettingInMemoryRepository();
    queueService = new InMemoryStorageMigrationQueueService();
    sut = new StorageMigrationStartUseCase(
      storageRepo,
      settingRepo,
      queueService,
    );
    await settingRepo.update({ STORAGE_DRIVER: E_STORAGE_LOCATION.S3 });
  });

  it('enfileira job com arquivos do driver oposto', async () => {
    await seedFile(storageRepo, 'a.txt', E_STORAGE_LOCATION.LOCAL);
    await seedFile(storageRepo, 'b.txt', E_STORAGE_LOCATION.LOCAL);
    await seedFile(storageRepo, 'c.txt', E_STORAGE_LOCATION.S3);

    const result = await sut.execute({
      concurrency: 5,
      retry_failed_only: false,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.queued_count).toBe(2);
    expect(result.value.job_id).toBeTruthy();
    expect(queueService.jobs.length).toBe(1);
    expect(queueService.jobs[0].type).toBe('migrate');
  });

  it('retorna 409 se já há job ativo', async () => {
    await seedFile(storageRepo, 'a.txt', E_STORAGE_LOCATION.LOCAL);
    await queueService.enqueueMigration({
      source_driver: E_STORAGE_LOCATION.LOCAL,
      target_driver: E_STORAGE_LOCATION.S3,
      file_ids: [],
      concurrency: 5,
    });

    const result = await sut.execute({
      concurrency: 5,
      retry_failed_only: false,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(409);
    expect(result.value.cause).toBe('MIGRATION_ALREADY_RUNNING');
  });

  it('retorna 400 quando não há arquivos no driver oposto', async () => {
    await seedFile(storageRepo, 'a.txt', E_STORAGE_LOCATION.S3);

    const result = await sut.execute({
      concurrency: 5,
      retry_failed_only: false,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(400);
    expect(result.value.cause).toBe('NO_FILES_TO_MIGRATE');
  });

  it('retry_failed_only filtra apenas docs com migration_status=failed', async () => {
    await seedFile(
      storageRepo,
      'a.txt',
      E_STORAGE_LOCATION.LOCAL,
      E_STORAGE_MIGRATION_STATUS.FAILED,
    );
    await seedFile(
      storageRepo,
      'b.txt',
      E_STORAGE_LOCATION.LOCAL,
      E_STORAGE_MIGRATION_STATUS.IDLE,
    );

    const result = await sut.execute({
      concurrency: 5,
      retry_failed_only: true,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.queued_count).toBe(1);
  });
});
