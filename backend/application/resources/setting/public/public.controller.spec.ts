import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { Setting } from '@application/model/setting.model';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';

describe('E2E Setting Public Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
    await Setting.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('GET /setting/public', () => {
    it('deve retornar defaults sem autenticação quando o documento não existe', async () => {
      const response = await supertest(kernel.server).get('/setting/public');

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
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

    it('deve retornar configurações persistidas sem autenticação', async () => {
      await Setting.create({
        SYSTEM_NAME: 'RTVE',
        SYSTEM_DESCRIPTION: 'Plataforma RTVE',
        LOGO_SMALL_URL: '/storage/logo-small.webp',
        LOGO_LARGE_URL: '/storage/logo-large.webp',
        AI_ASSISTANT_ENABLED: true,
        SETUP_COMPLETED: true,
        SETUP_CURRENT_STEP: null,
        OPENAI_API_KEY: 'sk-secret',
        EMAIL_PROVIDER_PASSWORD: 'super-secret',
        STORAGE_SECRET_KEY: 'aws-secret',
      });

      const response = await supertest(kernel.server).get('/setting/public');

      expect(response.statusCode).toBe(200);
      expect(response.body.SYSTEM_NAME).toBe('RTVE');
      expect(response.body.SYSTEM_DESCRIPTION).toBe('Plataforma RTVE');
      expect(response.body.LOGO_SMALL_URL).toBe('/storage/logo-small.webp');
      expect(response.body.LOGO_LARGE_URL).toBe('/storage/logo-large.webp');
      expect(response.body.AI_ASSISTANT_ENABLED).toBe(true);
      expect(response.body.SETUP_COMPLETED).toBe(true);
      expect(response.body.SETUP_CURRENT_STEP).toBeNull();
    });

    it('não deve expor campos sensíveis', async () => {
      await Setting.create({
        SYSTEM_NAME: 'RTVE',
        OPENAI_API_KEY: 'sk-secret',
        EMAIL_PROVIDER_PASSWORD: 'super-secret',
        STORAGE_SECRET_KEY: 'aws-secret',
        STORAGE_ACCESS_KEY: 'aws-access',
      });

      const response = await supertest(kernel.server).get('/setting/public');

      expect(response.statusCode).toBe(200);
      expect(response.body).not.toHaveProperty('OPENAI_API_KEY');
      expect(response.body).not.toHaveProperty('EMAIL_PROVIDER_PASSWORD');
      expect(response.body).not.toHaveProperty('EMAIL_PROVIDER_USER');
      expect(response.body).not.toHaveProperty('EMAIL_PROVIDER_HOST');
      expect(response.body).not.toHaveProperty('STORAGE_SECRET_KEY');
      expect(response.body).not.toHaveProperty('STORAGE_ACCESS_KEY');
      expect(response.body).not.toHaveProperty('STORAGE_BUCKET');
      expect(response.body).not.toHaveProperty('STORAGE_ENDPOINT');
    });
  });
});
