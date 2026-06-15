import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E Sign Out Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('POST /authentication/sign-out', () => {
    it('deve fazer logout com sucesso e limpar cookies', async () => {
      const { cookies } = await createAuthenticatedUser();

      const response = await supertest(kernel.server)
        .post('/authentication/sign-out')
        .set('Cookie', cookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Logout realizado com sucesso');

      const responseCookies = Array.from<string>(
        response.headers['set-cookie'],
      );
      expect(responseCookies.some((c) => c.includes('accessToken_'))).toBe(
        true,
      );
      expect(responseCookies.some((c) => c.includes('refreshToken_'))).toBe(
        true,
      );
      expect(responseCookies.some((c) => c.includes('activeAccountId=;'))).toBe(
        true,
      );
    });

    it('deve remover apenas a conta ativa quando houver outra conta autenticada', async () => {
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

      const response = await agent.post('/authentication/sign-out').send({});

      expect(response.statusCode).toBe(200);
      expect(response.body.activeAccountId).toBe(first.user._id);

      const profile = await agent.get('/profile');

      expect(profile.statusCode).toBe(200);
      expect(profile.body.email).toBe(first.user.email);
    });
  });
});
