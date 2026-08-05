import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { E_ROLE } from '@application/core/entity.core';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E User Bulk Trash Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('PATCH /users/bulk-trash', () => {
    it('deve enviar varios usuarios para a lixeira', async () => {
      const { cookies } = await createAuthenticatedUser();

      const group = await UserGroup.create({
        name: 'Manager',
        slug: E_ROLE.MANAGER,
        permissions: [],
      });
      const u1 = await User.create({
        name: 'A',
        email: 'a@x.com',
        password: 'p',
        group: group._id,
      });
      const u2 = await User.create({
        name: 'B',
        email: 'b@x.com',
        password: 'p',
        group: group._id,
      });

      const response = await supertest(kernel.server)
        .patch('/users/bulk-trash')
        .set('Cookie', cookies)
        .send({ ids: [u1._id.toString(), u2._id.toString()] });

      expect(response.statusCode).toBe(200);
      expect(response.body.modified).toBe(2);
    });

    it('deve retornar 401 sem autenticacao', async () => {
      const response = await supertest(kernel.server)
        .patch('/users/bulk-trash')
        .send({ ids: ['x'] });
      expect(response.statusCode).toBe(401);
    });
  });
});
