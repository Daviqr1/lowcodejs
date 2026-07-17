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

const schemaBuilder = new MongooseSchemaBuilder();

describe('E2E Table Field Update Controller', () => {
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

  describe('PUT /tables/:slug/fields/:_id', () => {
    it('deve atualizar campo com sucesso', async () => {
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
        name: 'My Field',
        slug: 'my-field',
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

      const updatePayload: FieldCreatePayload = {
        category: [],
        dropdown: [],
        defaultValue: null,
        showInFilter: true,
        permissions: buildFieldPermissions(true, true, true),
        format: null,
        group: null,
        locked: false,
        allowCreateRelationshipRecords: false,
        multiple: false,
        required: true,
        relationship: null,
        name: 'Updated Field',
        slug: 'updated-field',
        type: E_FIELD_TYPE.TEXT_SHORT,
        widthInForm: 75,
        widthInList: 30,
        widthInDetail: null,
      };

      const response = await supertest(kernel.server)
        .put(`/tables/${table.slug}/fields/${field._id}`)
        .set('Cookie', cookies)
        .send(updatePayload);

      expect(response.statusCode).toBe(200);
      expect(response.body.name).toBe('Updated Field');
      expect(response.body.required).toBe(true);
      expect(response.body.showInFilter).toBe(true);
      expect(response.body.widthInForm).toBe(75);
      expect(response.body.widthInList).toBe(30);
    });

    it('deve persistir label customizado em campo nativo', async () => {
      const { cookies, user } = await createAuthenticatedUser();

      const fieldPayload: FieldCreatePayload = {
        category: [],
        dropdown: [],
        defaultValue: null,
        showInFilter: true,
        permissions: buildFieldPermissions(true, true, true),
        format: 'dd/MM/yyyy HH:mm:ss',
        group: null,
        locked: true,
        allowCreateRelationshipRecords: false,
        multiple: false,
        required: false,
        relationship: null,
        name: 'Modificado em',
        slug: 'updatedAt',
        type: E_FIELD_TYPE.UPDATED_AT,
        widthInForm: null,
        widthInList: null,
        widthInDetail: null,
      };

      const field = await Field.create({ ...fieldPayload, native: true });

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

      const response = await supertest(kernel.server)
        .put(`/tables/${table.slug}/fields/${field._id}`)
        .set('Cookie', cookies)
        .send({
          name: 'Modificado em',
          type: E_FIELD_TYPE.UPDATED_AT,
          label: {
            list: 'Atualizado em',
            filter: null,
            form: null,
            detail: null,
          },
          showInFilter: true,
          permissions: buildFieldPermissions(true, true, true),
          widthInForm: 50,
          widthInList: 10,
          widthInDetail: 50,
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.label).toEqual({
        list: 'Atualizado em',
        filter: null,
        form: null,
        detail: null,
      });

      const persisted = await Field.findById(field._id);
      expect(persisted?.label?.list).toBe('Atualizado em');
      expect(persisted?.label?.filter).toBeNull();
      expect(persisted?.label?.form).toBeNull();
      expect(persisted?.label?.detail).toBeNull();
    });
  });
});
