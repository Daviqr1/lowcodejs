import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E UserGroup Empty Trash Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('DELETE /user-group/empty-trash', () => {
    it('deve esvaziar a lixeira', async () => {
      const { cookies } = await createAuthenticatedUser();

      await UserGroup.create({
        name: 'Custom',
        slug: 'custom-' + Date.now(),
        permissions: [],
        trashed: true,
        trashedAt: new Date(),
      });

      const response = await supertest(kernel.server)
        .delete('/user-group/empty-trash')
        .set('Cookie', cookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.deleted).toBe(1);
    });

    it('deve retornar 401 sem autenticacao', async () => {
      const response = await supertest(kernel.server).delete(
        '/user-group/empty-trash',
      );
      expect(response.statusCode).toBe(401);
    });
  });
});
