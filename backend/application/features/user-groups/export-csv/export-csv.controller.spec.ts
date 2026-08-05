import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E User Group Export CSV Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('GET /user-group/exports/csv', () => {
    it('deve retornar 401 sem token', async () => {
      const response = await supertest(kernel.server).get(
        '/user-group/exports/csv',
      );
      expect(response.statusCode).toBe(401);
    });

    it('deve retornar CSV com headers corretos para MASTER', async () => {
      const { cookies } = await createAuthenticatedUser();

      const response = await supertest(kernel.server)
        .get('/user-group/exports/csv')
        .set('Cookie', cookies);

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('grupos-');
    });
  });
});
