import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E UserGroup Send To Trash Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('PATCH /user-group/:_id/trash', () => {
    it('deve enviar grupo para a lixeira', async () => {
      const { cookies } = await createAuthenticatedUser();

      const group = await UserGroup.create({
        name: 'Custom',
        slug: 'custom-' + Date.now(),
        permissions: [],
      });

      const response = await supertest(kernel.server)
        .patch(`/user-group/${group._id}/trash`)
        .set('Cookie', cookies);

      expect(response.statusCode).toBe(200);
    });

    it('deve retornar 401 sem autenticacao', async () => {
      const response = await supertest(kernel.server).patch(
        '/user-group/x/trash',
      );
      expect(response.statusCode).toBe(401);
    });
  });
});
