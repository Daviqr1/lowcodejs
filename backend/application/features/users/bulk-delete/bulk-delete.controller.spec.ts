import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { E_ROLE } from '@application/core/entity.core';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E User Bulk Delete Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('DELETE /users/bulk-delete', () => {
    it('deve excluir permanentemente usuarios na lixeira', async () => {
      const { cookies } = await createAuthenticatedUser();

      const group = await UserGroup.create({
        name: 'Manager',
        slug: E_ROLE.MANAGER,
        permissions: [],
      });
      const u = await User.create({
        name: 'A',
        email: 'a@x.com',
        password: 'p',
        group: group._id,
        trashed: true,
        trashedAt: new Date(),
      });

      const response = await supertest(kernel.server)
        .delete('/users/bulk-delete')
        .set('Cookie', cookies)
        .send({ ids: [u._id.toString()] });

      expect(response.statusCode).toBe(200);
      expect(response.body.deleted).toBe(1);
    });

    it('deve retornar 401 sem autenticacao', async () => {
      const response = await supertest(kernel.server)
        .delete('/users/bulk-delete')
        .send({ ids: ['x'] });
      expect(response.statusCode).toBe(401);
    });
  });
});
