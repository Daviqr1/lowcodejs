import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E Profile Update Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('PUT /profile', () => {
    it('deve atualizar perfil do usuario com sucesso', async () => {
      const { cookies, user } = await createAuthenticatedUser();

      const response = await supertest(kernel.server)
        .put('/profile')
        .set('Cookie', cookies)
        .send({
          name: 'Nome Atualizado',
          email: user.email,
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.name).toBe('Nome Atualizado');
    });
  });
});
