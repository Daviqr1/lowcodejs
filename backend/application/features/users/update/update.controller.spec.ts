import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { E_USER_STATUS } from '@application/core/entity.core';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E User Update Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('PATCH /users/:_id', () => {
    it('deve atualizar usuario com sucesso', async () => {
      const { cookies, user, permissions } = await createAuthenticatedUser();
      const group = await UserGroup.create({
        name: 'Customer',
        slug: 'customer',
        permissions,
      });

      const response = await supertest(kernel.server)
        .patch(`/users/${user._id}`)
        .set('Cookie', cookies)
        .send({
          name: 'Updated Name',
          email: user.email,
          group: group._id.toString(),
          password: 'S3nha@123A',
          status: E_USER_STATUS.ACTIVE,
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.name).toBe('Updated Name');
    });
  });
});
