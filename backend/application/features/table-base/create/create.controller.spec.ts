import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { Field } from '@application/model/field.model';
import { Table } from '@application/model/table.model';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import {
  createAuthenticatedUser,
  createAuthenticatedUserInGroup,
} from '@test/helpers/auth.helper';

describe('E2E Table Create Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
    await Table.deleteMany({});
    await Field.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('POST /tables', () => {
    it('deve criar tabela com sucesso', async () => {
      const { cookies } = await createAuthenticatedUser();

      const response = await supertest(kernel.server)
        .post('/tables')
        .set('Cookie', cookies)
        .send({
          name: 'My Table',
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.name).toBe('My Table');
      expect(response.body.slug).toBeDefined();
    });

    it('deve negar criação de tabela para REGISTERED (403)', async () => {
      const { cookies } = await createAuthenticatedUserInGroup({
        groupSlug: 'registered',
        groupName: 'Registered',
        // Registered nao tem CREATE_TABLE — so visualiza e cria rows.
        permissionSlugs: [
          E_TABLE_PERMISSION.VIEW_TABLE,
          E_TABLE_PERMISSION.VIEW_FIELD,
          E_TABLE_PERMISSION.VIEW_ROW,
          E_TABLE_PERMISSION.CREATE_ROW,
        ],
      });

      const response = await supertest(kernel.server)
        .post('/tables')
        .set('Cookie', cookies)
        .send({ name: 'Blocked Table' });

      expect(response.statusCode).toBe(403);
      expect(response.body.cause).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });
});
