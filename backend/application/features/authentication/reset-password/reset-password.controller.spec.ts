import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E Reset Password Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('PUT /authentication/recovery/update-password', () => {
    it('deve atualizar senha com sucesso', async () => {
      const { cookies } = await createAuthenticatedUser();

      const response = await supertest(kernel.server)
        .put('/authentication/recovery/update-password')
        .set('Cookie', cookies)
        .send({
          password: 'S3nha@123A',
        });

      expect(response.statusCode).toBe(200);
    });
  });
});
