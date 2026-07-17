import { beforeEach, describe, expect, it } from 'vitest';

import SettingInMemoryRepository from '@application/repositories/setting/setting-in-memory.repository';
import InMemoryStorageService from '@application/services/storage/in-memory-storage.service';

import SettingUpdateUseCase from './update.use-case';

let settingInMemoryRepository: SettingInMemoryRepository;
let storageService: InMemoryStorageService;
let sut: SettingUpdateUseCase;

describe('Setting Update Use Case', () => {
  beforeEach(() => {
    settingInMemoryRepository = new SettingInMemoryRepository();
    storageService = new InMemoryStorageService();
    sut = new SettingUpdateUseCase(settingInMemoryRepository, storageService);
  });

  it('deve atualizar configurações com sucesso', async () => {
    const result = await sut.execute({
      LOCALE: 'en-us',
      FILE_UPLOAD_MAX_SIZE: 5242880,
      FILE_UPLOAD_ACCEPTED: 'jpg;png;pdf',
      MODEL_CLONE_TABLES: [
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012',
      ],
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.LOCALE).toBe('en-us');
    expect(result.value.FILE_UPLOAD_MAX_SIZE).toBe(5242880);
    expect(result.value.FILE_UPLOAD_ACCEPTED).toEqual(['jpg', 'png', 'pdf']);
    expect(result.value.MODEL_CLONE_TABLES).toEqual([
      '507f1f77bcf86cd799439011',
      '507f1f77bcf86cd799439012',
    ]);
  });

  it('nao deve mutar process.env apos update', async () => {
    const previousLocale = process.env.LOCALE;
    await sut.execute({ LOCALE: 'en-us' });
    expect(process.env.LOCALE).toBe(previousLocale);
  });

  it('deve retornar erro SETTINGS_UPDATE_ERROR quando houver falha', async () => {
    settingInMemoryRepository.simulateError(
      'update',
      new Error('Database error'),
    );

    const result = await sut.execute({
      LOCALE: 'pt-br',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('SETTINGS_UPDATE_ERROR');
    expect(result.value.message).toBe('Erro ao atualizar configurações');
  });
});
