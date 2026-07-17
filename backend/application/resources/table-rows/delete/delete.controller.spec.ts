import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  buildFieldPermissions,
  E_FIELD_TYPE,
  E_TABLE_STYLE,
  E_TABLE_TYPE,
} from '@application/core/entity.core';
import { Field } from '@application/model/field.model';
import { Table } from '@application/model/table.model';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { FieldCreatePayload } from '@application/repositories/field/field-contract.repository';
import { TableCreatePayload } from '@application/repositories/table/table-contract.repository';
import MongooseSchemaBuilder from '@application/services/table/schema-builder.service';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';
import { cleanDynamicCollections } from '@test/helpers/database.helper';

const schemaBuilder = new MongooseSchemaBuilder();

describe('E2E Table Row Delete Controller', () => {
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

  describe('DELETE /tables/:slug/rows/:_id', () => {
    it('deve deletar linha com sucesso', async () => {
      const { cookies, user } = await createAuthenticatedUser();

      const fieldPayload: FieldCreatePayload = {
        category: [],
        dropdown: [],
        defaultValue: null,
        showInFilter: false,
        permissions: buildFieldPermissions(true, true, true),
        format: null,
        group: null,
        multiple: false,
        required: false,
        relationship: null,
        name: 'Name',
        slug: 'name',
        type: E_FIELD_TYPE.TEXT_SHORT,
        widthInForm: null,
        widthInList: null,
        widthInDetail: null,
      };

      const field = await Field.create(fieldPayload);

      const tablePayload: TableCreatePayload = {
        owner: user._id,
        fieldOrderForm: [],
        fieldOrderList: [],
        style: E_TABLE_STYLE.LIST,
        name: 'Products',
        slug: 'products',
        fields: [field._id.toString()],
        _schema: schemaBuilder.build([
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

      // Create a row first
      const createResponse = await supertest(kernel.server)
        .post('/tables/products/rows')
        .set('Cookie', cookies)
        .send({ name: 'Product 1' });

      const rowId = createResponse.body._id;

      const response = await supertest(kernel.server)
        .delete(`/tables/products/rows/${rowId}`)
        .set('Cookie', cookies);

      expect(response.statusCode).toBe(200);
    });
  });
});
