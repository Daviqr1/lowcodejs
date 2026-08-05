import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E User Paginated Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('GET /users/paginated', () => {
    it('deve retornar lista paginada de usuarios', async () => {
      const { cookies, permissions } = await createAuthenticatedUser();

      const group = await UserGroup.create({
        name: 'Customer',
        slug: 'customer',
        permissions,
      });

      await User.create({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        group: group._id.toString(),
      });

      const response = await supertest(kernel.server)
        .get('/users/paginated')
        .set('Cookie', cookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.total).toBeGreaterThanOrEqual(1);
    });
  });
});
