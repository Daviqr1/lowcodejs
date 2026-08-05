import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';

describe('E2E Sign Up Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});

    // Create the REGISTERED group required by sign-up use-case
    await UserGroup.create({
      name: 'Registered',
      slug: 'REGISTERED',
      permissions: [],
    });
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('POST /authentication/sign-up', () => {
    it('deve criar usuário com sucesso', async () => {
      const response = await supertest(kernel.server)
        .post('/authentication/sign-up')
        .send({
          name: 'Novo Usuário',
          email: 'novo@example.com',
          password: 'S3nha@123A',
        });

      expect(response.statusCode).toBe(201);
    });
  });
});
