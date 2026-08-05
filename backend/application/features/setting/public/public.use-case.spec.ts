import { beforeEach, describe, expect, it } from 'vitest';

import SettingInMemoryRepository from '@application/repositories/setting/setting-in-memory.repository';

import SettingPublicUseCase from './public.use-case';

let settingInMemoryRepository: SettingInMemoryRepository;
let sut: SettingPublicUseCase;

describe('Setting Public Use Case', () => {
  beforeEach(() => {
    settingInMemoryRepository = new SettingInMemoryRepository();
    sut = new SettingPublicUseCase(settingInMemoryRepository);
  });

  it('deve retornar defaults explícitos quando não há configurações no banco', async () => {
    const result = await sut.execute();

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value).toEqual({
      SYSTEM_NAME: 'LowCodeJs',
      SYSTEM_DESCRIPTION: 'Plataforma Oficial',
      LOGO_SMALL_URL: null,
      LOGO_LARGE_URL: null,
      LOGO_SMALL_DARK_URL: null,
      LOGO_LARGE_DARK_URL: null,
      LOGIN_BACKGROUND_URL: null,
      AI_ASSISTANT_ENABLED: false,
      CHAT_HISTORY_ENABLED: false,
      SETUP_COMPLETED: false,
      SETUP_CURRENT_STEP: 'admin',
    });
  });

  it('deve retornar apenas o subconjunto público quando configurações existem', async () => {
    await settingInMemoryRepository.update({
      SYSTEM_NAME: 'RTVE',
      SYSTEM_DESCRIPTION: 'Plataforma RTVE',
      LOGO_SMALL_URL: '/storage/logo-small.webp',
      LOGO_LARGE_URL: '/storage/logo-large.webp',
      AI_ASSISTANT_ENABLED: true,
      OPENAI_API_KEY: 'sk-secret',
      EMAIL_PROVIDER_PASSWORD: 'super-secret',
      STORAGE_SECRET_KEY: 'aws-secret',
    });

    const result = await sut.execute();

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value).toEqual({
      SYSTEM_NAME: 'RTVE',
      SYSTEM_DESCRIPTION: 'Plataforma RTVE',
      LOGO_SMALL_URL: '/storage/logo-small.webp',
      LOGO_LARGE_URL: '/storage/logo-large.webp',
      LOGO_SMALL_DARK_URL: null,
      LOGO_LARGE_DARK_URL: null,
      LOGIN_BACKGROUND_URL: null,
      AI_ASSISTANT_ENABLED: true,
      CHAT_HISTORY_ENABLED: false,
      SETUP_COMPLETED: false,
      SETUP_CURRENT_STEP: 'admin',
    });

    expect(result.value).not.toHaveProperty('OPENAI_API_KEY');
    expect(result.value).not.toHaveProperty('EMAIL_PROVIDER_PASSWORD');
    expect(result.value).not.toHaveProperty('STORAGE_SECRET_KEY');
  });

  it('deve retornar erro SETTINGS_READ_ERROR quando o repositório falhar', async () => {
    settingInMemoryRepository.simulateError('get', new Error('Database error'));

    const result = await sut.execute();

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('SETTINGS_READ_ERROR');
    expect(result.value.message).toBe('Erro ao buscar configurações');
  });
});
