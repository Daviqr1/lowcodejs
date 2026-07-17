import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  E_FIELD_TYPE,
  E_TABLE_STYLE,
  E_TABLE_TYPE,
  buildFieldPermissions,
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

const schemaBuilder = new MongooseSchemaBuilder();

describe('E2E Table Field Create Controller', () => {
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

  describe('POST /tables/:slug/fields', () => {
    it('deve criar campo com sucesso', async () => {
      const { cookies, user } = await createAuthenticatedUser();

      const fieldPayload: FieldCreatePayload = {
        category: [],
        dropdown: [],
        defaultValue: null,
        showInFilter: false,
        permissions: buildFieldPermissions(true, true, true),
        format: null,
        group: null,
        locked: false,
        allowCreateRelationshipRecords: false,
        multiple: false,
        required: false,
        relationship: null,
        name: 'Existing Field',
        slug: 'existing-field',
        type: E_FIELD_TYPE.TEXT_SHORT,
        widthInForm: 50,
        widthInList: 10,
        widthInDetail: null,
      };

      const field = await Field.create(fieldPayload);

      const tablePayload: TableCreatePayload = {
        owner: user._id,
        fieldOrderForm: [],
        fieldOrderList: [],
        style: E_TABLE_STYLE.LIST,
        name: 'My Table',
        slug: 'my-table',
        fields: [field._id.toString()],
        _schema: schemaBuilder.build([
          {
            ...field.toJSON(),
            _id: field._id.toString(),
          },
        ]),
        description: 'My description',
        logo: null,
        methods: {
          beforeSave: { code: null },
          afterSave: { code: null },
          onLoad: { code: null },
        },
        type: E_TABLE_TYPE.TABLE,
      };

      const table = await Table.create(tablePayload);

      const newFieldPayload: FieldCreatePayload = {
        category: [],
        dropdown: [],
        defaultValue: null,
        showInFilter: false,
        permissions: buildFieldPermissions(true, true, true),
        format: null,
        group: null,
        locked: false,
        allowCreateRelationshipRecords: false,
        multiple: false,
        required: false,
        relationship: null,
        name: 'My Field',
        slug: 'my-field',
        type: E_FIELD_TYPE.TEXT_SHORT,
        widthInForm: 75,
        widthInList: 30,
        widthInDetail: null,
      };

      const response = await supertest(kernel.server)
        .post(`/tables/${table.slug}/fields`)
        .set('Cookie', cookies)
        .send(newFieldPayload);

      expect(response.statusCode).toBe(201);
      expect(response.body.name).toBe('My Field');
      expect(response.body.type).toBe(E_FIELD_TYPE.TEXT_SHORT);
      expect(response.body.widthInForm).toBe(75);
      expect(response.body.widthInList).toBe(30);
    });
  });
});
