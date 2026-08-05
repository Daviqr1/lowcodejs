import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E UserGroup Bulk Trash Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('PATCH /user-group/bulk-trash', () => {
    it('deve enviar varios grupos para a lixeira', async () => {
      const { cookies } = await createAuthenticatedUser();

      const g = await UserGroup.create({
        name: 'Custom',
        slug: 'custom-' + Date.now(),
        permissions: [],
      });

      const response = await supertest(kernel.server)
        .patch('/user-group/bulk-trash')
        .set('Cookie', cookies)
        .send({ ids: [g._id.toString()] });

      expect(response.statusCode).toBe(200);
      expect(response.body.modified).toBe(1);
    });

    it('deve retornar 401 sem autenticacao', async () => {
      const response = await supertest(kernel.server)
        .patch('/user-group/bulk-trash')
        .send({ ids: ['x'] });
      expect(response.statusCode).toBe(401);
    });
  });
});
