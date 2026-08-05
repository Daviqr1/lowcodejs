import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E UserGroup Create Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('POST /user-group', () => {
    it('deve criar grupo com sucesso', async () => {
      const { cookies, permissions } = await createAuthenticatedUser();

      const response = await supertest(kernel.server)
        .post('/user-group')
        .set('Cookie', cookies)
        .send({
          name: 'Administradores',
          description: 'Grupo de administradores',
          permissions,
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.name).toBe('Administradores');
      expect(response.body.slug).toBe('administradores');
    });
  });
});
