import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E User Show Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('GET /users/:_id', () => {
    it('deve retornar usuario com sucesso', async () => {
      const { cookies, user } = await createAuthenticatedUser();

      const response = await supertest(kernel.server)
        .get(`/users/${user._id}`)
        .set('Cookie', cookies);

      expect(response.statusCode).toBe(200);
      expect(response.body._id).toBe(user._id);
      expect(response.body.email).toBe(user.email);
      expect(response.body.password).toBeUndefined();
    });
  });
});
