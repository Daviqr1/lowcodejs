import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E User Create Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('POST /users', () => {
    it('deve criar usuario com sucesso', async () => {
      const { cookies, permissions } = await createAuthenticatedUser();

      const group = await UserGroup.create({
        name: 'Customer',
        slug: 'customer',
        permissions,
      });

      const response = await supertest(kernel.server)
        .post('/users')
        .set('Cookie', cookies)
        .send({
          name: 'New User',
          email: 'newuser@example.com',
          password: 'S3nha@123A',
          group: group._id.toString(),
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.name).toBe('New User');
      expect(response.body.email).toBe('newuser@example.com');
    });
  });
});
