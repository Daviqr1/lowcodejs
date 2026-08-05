import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { E_MENU_ITEM_TYPE } from '@application/core/entity.core';
import { Menu } from '@application/model/menu.model';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E Menu Empty Trash Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
    await Menu.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('DELETE /menu/empty-trash', () => {
    it('deve esvaziar a lixeira', async () => {
      const { cookies } = await createAuthenticatedUser();

      await Menu.create({
        name: 'A',
        slug: 'a',
        type: E_MENU_ITEM_TYPE.PAGE,
        trashed: true,
        trashedAt: new Date(),
      });

      const response = await supertest(kernel.server)
        .delete('/menu/empty-trash')
        .set('Cookie', cookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.deleted).toBe(1);
    });

    it('deve retornar 401 sem autenticacao', async () => {
      const response = await supertest(kernel.server).delete(
        '/menu/empty-trash',
      );
      expect(response.statusCode).toBe(401);
    });
  });
});
