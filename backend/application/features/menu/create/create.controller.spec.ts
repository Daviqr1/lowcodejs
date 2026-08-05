import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { E_MENU_ITEM_TYPE } from '@application/core/entity.core';
import { Menu } from '@application/model/menu.model';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E Menu Create Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
    await Menu.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('POST /menu', () => {
    it('deve criar menu com sucesso', async () => {
      const { cookies } = await createAuthenticatedUser();

      const response = await supertest(kernel.server)
        .post('/menu')
        .set('Cookie', cookies)
        .send({
          name: 'Dashboard',
          type: E_MENU_ITEM_TYPE.PAGE,
          html: '<h1>Dashboard</h1>',
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.name).toBe('Dashboard');
      expect(response.body.slug).toBe('dashboard');
      expect(response.body.type).toBe(E_MENU_ITEM_TYPE.PAGE);
    });
  });
});
