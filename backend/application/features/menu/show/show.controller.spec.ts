import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { E_MENU_ITEM_TYPE } from '@application/core/entity.core';
import { Menu } from '@application/model/menu.model';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E Menu Show Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
    await Menu.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('GET /menu/:_id', () => {
    it('deve retornar menu com sucesso', async () => {
      const { cookies } = await createAuthenticatedUser();

      const menu = await Menu.create({
        name: 'Dashboard',
        slug: 'dashboard',
        type: E_MENU_ITEM_TYPE.PAGE,
        html: '<h1>Dashboard</h1>',
        parent: null,
        table: null,
        url: null,
      });

      const response = await supertest(kernel.server)
        .get(`/menu/${menu._id}`)
        .set('Cookie', cookies);

      expect(response.statusCode).toBe(200);
      expect(response.body._id).toBe(menu._id.toString());
      expect(response.body.name).toBe('Dashboard');
    });
  });
});
