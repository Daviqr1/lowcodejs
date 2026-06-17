import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  E_FIELD_TYPE,
  E_TABLE_COLLABORATION,
  E_TABLE_STYLE,
  E_TABLE_TYPE,
  E_TABLE_VISIBILITY,
} from '@application/core/entity.core';
import { buildSchema } from '@application/core/util.core';
import { Field } from '@application/model/field.model';
import { Table } from '@application/model/table.model';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { FieldCreatePayload } from '@application/repositories/field/field-contract.repository';
import { TableCreatePayload } from '@application/repositories/table/table-contract.repository';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';
import { cleanDynamicCollections } from '@test/helpers/database.helper';

describe('E2E Bulk Update Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
    await Table.deleteMany({});
    await Field.deleteMany({});

    await cleanDynamicCollections();
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('PATCH /tables/:slug/rows/bulk-update', () => {
    it('deve atualizar o mesmo campo em varios registros', async () => {
      const { cookies, user } = await createAuthenticatedUser();

      const fieldPayload: FieldCreatePayload = {
        category: [],
        dropdown: [],
        defaultValue: null,
        showInFilter: false,
        showInForm: true,
        showInDetail: true,
        format: null,
        group: null,
        showInList: true,
        multiple: false,
        required: false,
        relationship: null,
        name: 'Status',
        slug: 'status',
        type: E_FIELD_TYPE.TEXT_SHORT,
        widthInForm: null,
        widthInList: null,
        widthInDetail: null,
      };

      const field = await Field.create(fieldPayload);

      const tablePayload: TableCreatePayload = {
        owner: user._id,
        administrators: [],
        collaboration: E_TABLE_COLLABORATION.OPEN,
        fieldOrderForm: [],
        fieldOrderList: [],
        style: E_TABLE_STYLE.LIST,
        visibility: E_TABLE_VISIBILITY.PUBLIC,
        name: 'Products',
        slug: 'products',
        fields: [field._id.toString()],
        _schema: buildSchema([
          {
            ...field.toJSON(),
            _id: field._id.toString(),
          },
        ]),
        description: 'Products table',
        logo: null,
        methods: {
          beforeSave: { code: null },
          afterSave: { code: null },
          onLoad: { code: null },
        },
        type: E_TABLE_TYPE.TABLE,
      };

      await Table.create(tablePayload);

      const row1 = await supertest(kernel.server)
        .post('/tables/products/rows')
        .set('Cookie', cookies)
        .send({ status: 'aberto' });

      const row2 = await supertest(kernel.server)
        .post('/tables/products/rows')
        .set('Cookie', cookies)
        .send({ status: 'aberto' });

      const response = await supertest(kernel.server)
        .patch('/tables/products/rows/bulk-update')
        .set('Cookie', cookies)
        .send({
          ids: [row1.body._id, row2.body._id],
          data: { status: 'concluido' },
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.modified).toBe(2);

      const updated = await supertest(kernel.server)
        .get(`/tables/products/rows/${row1.body._id}`)
        .set('Cookie', cookies);

      expect(updated.body.status).toBe('concluido');
    });

    it('deve retornar 400 quando data estiver vazio', async () => {
      const { cookies, user } = await createAuthenticatedUser();

      const tablePayload: TableCreatePayload = {
        owner: user._id,
        administrators: [],
        collaboration: E_TABLE_COLLABORATION.OPEN,
        fieldOrderForm: [],
        fieldOrderList: [],
        style: E_TABLE_STYLE.LIST,
        visibility: E_TABLE_VISIBILITY.PUBLIC,
        name: 'Empties',
        slug: 'empties',
        fields: [],
        _schema: buildSchema([]),
        description: 'Empty table',
        logo: null,
        methods: {
          beforeSave: { code: null },
          afterSave: { code: null },
          onLoad: { code: null },
        },
        type: E_TABLE_TYPE.TABLE,
      };

      await Table.create(tablePayload);

      const response = await supertest(kernel.server)
        .patch('/tables/empties/rows/bulk-update')
        .set('Cookie', cookies)
        .send({ ids: ['507f1f77bcf86cd799439011'], data: {} });

      expect(response.statusCode).toBe(400);
    });
  });
});
