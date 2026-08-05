import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { Setting } from '@application/model/setting.model';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E Setting Show Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
    await Setting.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('GET /setting', () => {
    it('deve retornar configuracoes com sucesso (autenticado)', async () => {
      const { cookies } = await createAuthenticatedUser();

      const response = await supertest(kernel.server)
        .get('/setting')
        .set('Cookie', cookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toBeDefined();
    });
  });
});
