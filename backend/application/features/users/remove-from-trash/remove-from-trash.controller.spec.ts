import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { E_ROLE } from '@application/core/entity.core';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E User Remove From Trash Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('PATCH /users/:_id/restore', () => {
    it('deve restaurar usuario da lixeira', async () => {
      const { cookies } = await createAuthenticatedUser();

      const group = await UserGroup.create({
        name: 'Manager',
        slug: E_ROLE.MANAGER,
        permissions: [],
      });
      const target = await User.create({
        name: 'Target',
        email: 'target@x.com',
        password: 'p',
        group: group._id,
        trashed: true,
        trashedAt: new Date(),
      });

      const response = await supertest(kernel.server)
        .patch(`/users/${target._id}/restore`)
        .set('Cookie', cookies);

      expect(response.statusCode).toBe(200);
    });

    it('deve retornar 401 sem autenticacao', async () => {
      const response = await supertest(kernel.server).patch('/users/x/restore');
      expect(response.statusCode).toBe(401);
    });
  });
});
