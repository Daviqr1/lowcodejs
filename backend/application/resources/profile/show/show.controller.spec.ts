import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E Profile Show Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('GET /profile', () => {
    it('deve retornar perfil do usuario autenticado', async () => {
      const { cookies, user } = await createAuthenticatedUser();

      const response = await supertest(kernel.server)
        .get('/profile')
        .set('Cookie', cookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.email).toBe(user.email);
      expect(response.body.name).toBe(user.name);
    });

    it('deve retornar o perfil da conta ativa apos alternar contas', async () => {
      const agent = supertest.agent(kernel.server);
      const first = await createAuthenticatedUser({
        email: 'first@example.com',
        name: 'First User',
      });
      const second = await createAuthenticatedUser({
        email: 'second@example.com',
        name: 'Second User',
      });

      await agent
        .post('/authentication/sign-in')
        .send({ email: first.user.email, password: 'password123' });
      await agent
        .post('/authentication/sign-in')
        .send({ email: second.user.email, password: 'password123' });

      const secondProfile = await agent.get('/profile');

      expect(secondProfile.statusCode).toBe(200);
      expect(secondProfile.body.email).toBe(second.user.email);

      const switchResponse = await agent
        .post('/authentication/switch-account')
        .send({ accountId: first.user._id });

      expect(switchResponse.statusCode).toBe(200);
      expect(switchResponse.body.activeAccountId).toBe(first.user._id);

      const firstProfile = await agent.get('/profile');

      expect(firstProfile.statusCode).toBe(200);
      expect(firstProfile.body.email).toBe(first.user.email);
    });
  });
});
