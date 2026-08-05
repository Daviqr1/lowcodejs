import { beforeEach, describe, expect, it } from 'vitest';

import StorageInMemoryRepository from '@application/repositories/storage/storage-in-memory.repository';
import SlugService from '@application/services/slug/slug.service';
import InMemoryStorageService from '@application/services/storage/in-memory-storage.service';
import StorageConfigService from '@application/services/storage-config/storage-config.service';

import StorageDeleteUseCase from './delete.use-case';

let storageInMemoryRepository: StorageInMemoryRepository;
let storageService: InMemoryStorageService;
let sut: StorageDeleteUseCase;

describe('Storage Delete Use Case', () => {
  beforeEach(() => {
    storageInMemoryRepository = new StorageInMemoryRepository();
    storageService = new InMemoryStorageService();
    sut = new StorageDeleteUseCase(
      storageInMemoryRepository,
      storageService,
      new StorageConfigService(new SlugService()),
    );
  });

  it('deve deletar arquivo com sucesso', async () => {
    const storage = await storageInMemoryRepository.create({
      filename: 'random-name.webp',
      originalName: 'test.jpg',
      size: 1024,
      mimetype: 'image/webp',
    });

    const result = await sut.execute({ _id: storage._id });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value).toBeNull();
    const deleted = await storageInMemoryRepository.findById(storage._id);
    expect(deleted).toBeNull();
  });

  it('deve retornar erro STORAGE_NOT_FOUND quando arquivo nao existir', async () => {
    const result = await sut.execute({ _id: 'non-existent-id' });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('STORAGE_NOT_FOUND');
    expect(result.value.message).toBe('Arquivo não encontrado');
  });

  it('deve retornar erro STORAGE_DELETE_ERROR quando houver falha', async () => {
    storageInMemoryRepository.simulateError(
      'findById',
      new Error('Database error'),
    );

    const result = await sut.execute({ _id: 'some-id' });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('STORAGE_DELETE_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');
  });
});
