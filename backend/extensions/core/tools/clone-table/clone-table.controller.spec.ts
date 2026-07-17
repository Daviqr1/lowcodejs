import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { Field } from '@application/model/field.model';
import { Table } from '@application/model/table.model';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E Clone Table Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await Table.deleteMany({});
    await Field.deleteMany({});
    await User.deleteMany({});
    await UserGroup.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('POST /tools/clone-table', () => {
    it('deve clonar tabela com sucesso', async () => {
      const { cookies, user } = await createAuthenticatedUser();

      const baseTable = await Table.create({
        name: 'Tabela Original',
        slug: 'tabela-original',
        type: 'TABLE',
        owner: user._id,
        style: 'LIST',
        fieldOrderList: [],
        fieldOrderForm: [],
      });

      const response = await supertest(kernel.server)
        .post('/tools/clone-table')
        .set('Cookie', cookies)
        .send({
          baseTableId: baseTable._id.toString(),
          name: 'Tabela Clonada',
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.tableId).toBeDefined();
      expect(response.body.slug).toBe('tabela-clonada');
    });

    it('deve retornar 404 quando tabela base nao existe', async () => {
      const { cookies } = await createAuthenticatedUser();

      const response = await supertest(kernel.server)
        .post('/tools/clone-table')
        .set('Cookie', cookies)
        .send({
          baseTableId: '507f1f77bcf86cd799439011',
          name: 'Nova Tabela',
        });

      expect(response.statusCode).toBe(404);
      expect(response.body.cause).toBe('TABLE_NOT_FOUND');
    });

    it('deve retornar 409 quando ja existe tabela com o mesmo slug', async () => {
      const { cookies, user } = await createAuthenticatedUser();

      await Table.create({
        name: 'Tabela Existente',
        slug: 'tabela-existente',
        type: 'TABLE',
        owner: user._id,
        style: 'LIST',
        fieldOrderList: [],
        fieldOrderForm: [],
      });

      const response = await supertest(kernel.server)
        .post('/tools/clone-table')
        .set('Cookie', cookies)
        .send({
          baseTableId: '507f1f77bcf86cd799439011',
          name: 'Tabela Existente',
        });

      expect(response.statusCode).toBe(409);
      expect(response.body.cause).toBe('TABLE_ALREADY_EXISTS');
      expect(response.body.errors?.name).toBeDefined();
    });

    it('deve retornar 401 quando nao autenticado', async () => {
      const response = await supertest(kernel.server)
        .post('/tools/clone-table')
        .send({
          baseTableId: '507f1f77bcf86cd799439011',
          name: 'Nova Tabela',
        });

      expect(response.statusCode).toBe(401);
    });
  });
});
