import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { E_MENU_ITEM_TYPE } from '@application/core/entity.core';
import { Menu } from '@application/model/menu.model';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E Menu Bulk Trash Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
    await Menu.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('PATCH /menu/bulk-trash', () => {
    it('deve enviar varios menus para a lixeira', async () => {
      const { cookies } = await createAuthenticatedUser();

      const menu1 = await Menu.create({
        name: 'A',
        slug: 'a',
        type: E_MENU_ITEM_TYPE.PAGE,
      });
      const menu2 = await Menu.create({
        name: 'B',
        slug: 'b',
        type: E_MENU_ITEM_TYPE.PAGE,
      });

      const response = await supertest(kernel.server)
        .patch('/menu/bulk-trash')
        .set('Cookie', cookies)
        .send({ ids: [menu1._id.toString(), menu2._id.toString()] });

      expect(response.statusCode).toBe(200);
      expect(response.body.modified).toBe(2);
    });

    it('deve retornar 401 sem autenticacao', async () => {
      const response = await supertest(kernel.server)
        .patch('/menu/bulk-trash')
        .send({ ids: ['some-id'] });

      expect(response.statusCode).toBe(401);
    });
  });
});
