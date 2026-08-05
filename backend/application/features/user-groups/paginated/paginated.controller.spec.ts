import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E UserGroup Paginated Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('GET /user-group/paginated', () => {
    it('deve retornar lista paginada de grupos', async () => {
      const { cookies } = await createAuthenticatedUser();

      const response = await supertest(kernel.server)
        .get('/user-group/paginated')
        .set('Cookie', cookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.meta).toBeDefined();
    });
  });
});
