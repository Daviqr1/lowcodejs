import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { Setting } from '@application/model/setting.model';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E Setting Update Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
    await Setting.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('PUT /setting', () => {
    it('deve atualizar configuracoes com sucesso', async () => {
      const { cookies } = await createAuthenticatedUser();

      const response = await supertest(kernel.server)
        .put('/setting')
        .set('Cookie', cookies)
        .send({
          SYSTEM_NAME: 'Test System',
          LOCALE: 'pt-br',
          FILE_UPLOAD_MAX_SIZE: 5242880,
          FILE_UPLOAD_ACCEPTED: 'image/png;image/jpeg;application/pdf',
          FILE_UPLOAD_MAX_FILES_PER_UPLOAD: 10,
          PAGINATION_PER_PAGE: 50,
          LOGO_SMALL_URL: null,
          LOGO_LARGE_URL: null,
          EMAIL_PROVIDER_PASSWORD: 'test-password',
          EMAIL_PROVIDER_HOST: 'smtp.test.com',
          EMAIL_PROVIDER_PORT: 587,
          EMAIL_PROVIDER_USER: 'test@test.com',
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.LOCALE).toBe('pt-br');
      expect(response.body.PAGINATION_PER_PAGE).toBe(50);
    });
  });
});
