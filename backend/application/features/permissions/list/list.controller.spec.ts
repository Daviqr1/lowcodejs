import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { Permission } from '@application/model/permission.model';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E Permissions List Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('GET /permissions', () => {
    it('deve listar permissoes com sucesso', async () => {
      const { cookies } = await createAuthenticatedUser();

      // Create some permissions
      await Permission.create({
        name: 'View Users',
        slug: 'VIEW_USERS',
        description: 'Permission to view users',
      });

      await Permission.create({
        name: 'Create Users',
        slug: 'CREATE_USERS',
        description: 'Permission to create users',
      });

      const response = await supertest(kernel.server)
        .get('/permissions')
        .set('Cookie', cookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });
  });
});
