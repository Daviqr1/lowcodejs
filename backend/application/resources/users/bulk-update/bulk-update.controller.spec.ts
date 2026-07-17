import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { E_USER_STATUS } from '@application/core/entity.core';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E User Bulk Update Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('PATCH /users/bulk-update', () => {
    it('deve alterar o status de varios usuarios e excluir o proprio', async () => {
      const { cookies, user, permissions } = await createAuthenticatedUser();
      const group = await UserGroup.create({
        name: 'Customer',
        slug: 'customer',
        permissions,
      });

      const u1 = await User.create({
        name: 'U1',
        email: 'u1@demo.com',
        password: 'hash',
        status: E_USER_STATUS.ACTIVE,
        group: group._id,
      });
      const u2 = await User.create({
        name: 'U2',
        email: 'u2@demo.com',
        password: 'hash',
        status: E_USER_STATUS.ACTIVE,
        group: group._id,
      });

      const response = await supertest(kernel.server)
        .patch('/users/bulk-update')
        .set('Cookie', cookies)
        .send({
          ids: [u1._id.toString(), u2._id.toString(), user._id.toString()],
          status: E_USER_STATUS.INACTIVE,
        });

      expect(response.statusCode).toBe(200);
      // self (user) e excluido -> apenas 2 modificados
      expect(response.body.modified).toBe(2);

      const u1After = await User.findById(u1._id);
      expect(u1After?.status).toBe(E_USER_STATUS.INACTIVE);
    });

    it('deve rejeitar status invalido com 400', async () => {
      const { cookies } = await createAuthenticatedUser();

      const response = await supertest(kernel.server)
        .patch('/users/bulk-update')
        .set('Cookie', cookies)
        .send({ ids: ['507f1f77bcf86cd799439011'], status: 'BANANA' });

      expect(response.statusCode).toBe(400);
    });
  });
});
