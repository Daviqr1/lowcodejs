import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E UserGroup Show Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('GET /user-group/:_id', () => {
    it('deve retornar grupo com sucesso', async () => {
      const { cookies, permissions } = await createAuthenticatedUser();
      const group = await UserGroup.create({
        name: 'Owner',
        slug: 'owner',
        permissions,
      });

      const response = await supertest(kernel.server)
        .get(`/user-group/${group!._id}`)
        .set('Cookie', cookies);

      expect(response.statusCode).toBe(200);
      expect(response.body._id).toBe(group!._id.toString());
      expect(response.body.name).toBe('Owner');
    });
  });
});
