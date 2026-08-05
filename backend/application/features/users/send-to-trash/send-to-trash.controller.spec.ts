import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { E_ROLE } from '@application/core/entity.core';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E User Send To Trash Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('PATCH /users/:_id/trash', () => {
    it('deve enviar usuario para a lixeira', async () => {
      const { cookies } = await createAuthenticatedUser();

      const managerGroup = await UserGroup.create({
        name: 'Manager',
        slug: E_ROLE.MANAGER,
        permissions: [],
      });
      const target = await User.create({
        name: 'Target',
        email: 'target@x.com',
        password: 'pwd',
        group: managerGroup._id,
      });

      const response = await supertest(kernel.server)
        .patch(`/users/${target._id}/trash`)
        .set('Cookie', cookies);

      expect(response.statusCode).toBe(200);
    });

    it('deve retornar 401 sem autenticacao', async () => {
      const response = await supertest(kernel.server).patch(
        '/users/some-id/trash',
      );
      expect(response.statusCode).toBe(401);
    });
  });
});
