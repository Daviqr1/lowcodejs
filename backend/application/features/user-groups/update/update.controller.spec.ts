import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E UserGroup Update Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('PATCH /user-group/:_id', () => {
    it('deve atualizar grupo com sucesso', async () => {
      const { cookies, permissions } = await createAuthenticatedUser();
      const group = await UserGroup.create({
        name: 'Owner',
        slug: 'owner',
        permissions,
      });

      const response = await supertest(kernel.server)
        .patch(`/user-group/${group!._id}`)
        .set('Cookie', cookies)
        .send({
          name: 'Owner Updated',
          description: 'Updated description',
          permissions,
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.name).toBe('Owner Updated');
    });
  });
});
