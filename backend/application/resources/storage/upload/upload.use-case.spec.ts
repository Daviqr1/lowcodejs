// Spec constrói mocks parciais de entidades do domínio via asserção.
/* eslint-disable @typescript-eslint/consistent-type-assertions */
import type { MultipartFile } from '@fastify/multipart';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import StorageInMemoryRepository from '@application/repositories/storage/storage-in-memory.repository';
import InMemoryStorageService from '@application/services/storage/in-memory-storage.service';

import StorageUploadUseCase from './upload.use-case';

let storageInMemoryRepository: StorageInMemoryRepository;
let storageService: InMemoryStorageService;
let sut: StorageUploadUseCase;

function createMockFile(filename: string): MultipartFile {
  return {
    filename,
    mimetype: 'image/jpeg',
    encoding: '7bit',
    type: 'file',
    fieldname: 'file',
    file: {} as unknown as import('node:stream').Readable,
    fields: {},
    toBuffer: vi.fn(),
  } as unknown as MultipartFile;
}

describe('Storage Upload Use Case', () => {
  beforeEach(() => {
    storageInMemoryRepository = new StorageInMemoryRepository();
    storageService = new InMemoryStorageService();
    sut = new StorageUploadUseCase(storageInMemoryRepository, storageService);
  });

  it('deve fazer upload de arquivos com sucesso', async () => {
    async function* mockFiles(): AsyncIterableIterator<MultipartFile> {
      yield createMockFile('test.jpg');
    }

    const result = await sut.execute(mockFiles());

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value).toHaveLength(1);
  });

  it('deve fazer upload de multiplos arquivos', async () => {
    async function* mockFiles(): AsyncIterableIterator<MultipartFile> {
      yield createMockFile('test1.jpg');
      yield createMockFile('test2.jpg');
    }

    const result = await sut.execute(mockFiles());

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value).toHaveLength(2);
  });

  it('deve retornar lista vazia quando nao houver arquivos', async () => {
    async function* mockFiles(): AsyncIterableIterator<MultipartFile> {
      // sem arquivos
    }

    const result = await sut.execute(mockFiles());

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value).toHaveLength(0);
  });

  it('deve retornar erro STORAGE_UPLOAD_ERROR quando houver falha', async () => {
    storageService.simulateError('upload', new Error('Upload error'));

    async function* mockFiles(): AsyncIterableIterator<MultipartFile> {
      yield createMockFile('test.jpg');
    }

    const result = await sut.execute(mockFiles());

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('STORAGE_UPLOAD_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');
  });
});
