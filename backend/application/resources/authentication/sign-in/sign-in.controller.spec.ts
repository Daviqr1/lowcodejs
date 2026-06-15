import bcrypt from 'bcryptjs';
import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { E_USER_STATUS } from '@application/core/entity.core';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';

async function createUser(
  email: string,
  name: string,
  password = 'S3nha@123A',
): Promise<{ email: string; password: string }> {
  const hashedPassword = await bcrypt.hash(password, 10);
  let group = await UserGroup.findOne({ slug: 'master' });

  if (!group) {
    group = await UserGroup.create({
      name: 'Master',
      slug: 'master',
      permissions: [],
    });
  }

  await User.create({
    name,
    email,
    password: hashedPassword,
    status: E_USER_STATUS.ACTIVE,
    group: group._id,
  });

  return { email, password };
}

describe('E2E Sign In Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('POST /authentication/sign-in', () => {
    it('deve retornar 200 e setar cookies com credenciais validas', async () => {
      const hashedPassword = await bcrypt.hash('S3nha@123A', 10);

      const group = await UserGroup.create({
        name: 'Owner',
        slug: 'owner',
        permissions: [],
      });

      await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: hashedPassword,
        status: E_USER_STATUS.ACTIVE,
        group: group._id,
      });

      const response = await supertest(kernel.server)
        .post('/authentication/sign-in')
        .send({
          email: 'test@example.com',
          password: 'S3nha@123A',
        });

      expect(response.statusCode).toBe(200);
      expect(response.headers['set-cookie']).toBeDefined();

      const cookies = Array.from<string>(response.headers['set-cookie']);
      expect(cookies.some((c) => c.includes('accessToken'))).toBe(true);
      expect(cookies.some((c) => c.includes('refreshToken'))).toBe(true);
    });

    it('deve manter duas contas autenticadas simultaneamente', async () => {
      const agent = supertest.agent(kernel.server);
      const first = await createUser('first@example.com', 'First User');
      const second = await createUser('second@example.com', 'Second User');

      const firstResponse = await agent
        .post('/authentication/sign-in')
        .send(first);
      const secondResponse = await agent
        .post('/authentication/sign-in')
        .send(second);

      expect(firstResponse.statusCode).toBe(200);
      expect(secondResponse.statusCode).toBe(200);

      const accountsResponse = await agent.get('/authentication/accounts');

      expect(accountsResponse.statusCode).toBe(200);
      expect(accountsResponse.body.activeAccountId).toBeDefined();
      expect(accountsResponse.body.accounts).toHaveLength(2);
      expect(
        accountsResponse.body.accounts.map(
          (account: { email: string }) => account.email,
        ),
      ).toEqual(expect.arrayContaining([first.email, second.email]));
    });

    it('deve bloquear uma terceira conta simultanea', async () => {
      const agent = supertest.agent(kernel.server);
      const first = await createUser('first@example.com', 'First User');
      const second = await createUser('second@example.com', 'Second User');
      const third = await createUser('third@example.com', 'Third User');

      await agent.post('/authentication/sign-in').send(first);
      await agent.post('/authentication/sign-in').send(second);

      const response = await agent.post('/authentication/sign-in').send(third);

      expect(response.statusCode).toBe(409);
      expect(response.body.cause).toBe('MULTI_ACCOUNT_LIMIT_REACHED');
    });
  });
});
