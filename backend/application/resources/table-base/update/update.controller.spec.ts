import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  buildFieldPermissions,
  E_FIELD_TYPE,
  E_TABLE_PERMISSION,
  E_TABLE_STYLE,
  E_TABLE_TYPE,
  E_USER_STATUS,
} from '@application/core/entity.core';
import { Field } from '@application/model/field.model';
import { Table } from '@application/model/table.model';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { FieldCreatePayload } from '@application/repositories/field/field-contract.repository';
import { TableCreatePayload } from '@application/repositories/table/table-contract.repository';
import MongooseModelBuilder from '@application/services/table/model-builder.service';
import MongooseSchemaBuilder from '@application/services/table/schema-builder.service';
import { kernel } from '@start/kernel';
import {
  createAuthenticatedUser,
  createAuthenticatedUserInGroup,
} from '@test/helpers/auth.helper';
import { dropDynamicCollections } from '@test/helpers/database.helper';

const schemaBuilder = new MongooseSchemaBuilder();
const modelBuilder = new MongooseModelBuilder(schemaBuilder);

describe('E2E Table Update Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
    await Table.deleteMany({});
    await Field.deleteMany({});

    await dropDynamicCollections(['my-table', 'updated-table']);
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('PUT /tables/:slug', () => {
    it('deve atualizar tabela com sucesso', async () => {
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

      // Criar a coleção dinâmica para que o rename funcione
      await modelBuilder.build({
        ...table.toJSON(),
        _id: table._id.toString(),
        fields: [{ ...field.toJSON(), _id: field._id.toString() }],
      });

      const response = await supertest(kernel.server)
        .put(`/tables/${table.slug}`)
        .set('Cookie', cookies)
        .send({
          name: 'Updated Table',
          description: 'Updated description',
          logo: null,
          style: E_TABLE_STYLE.LIST,
          fieldOrderList: [],
          fieldOrderForm: [],
          methods: {
            beforeSave: { code: null },
            afterSave: { code: null },
            onLoad: { code: null },
          },
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.name).toBe('Updated Table');
      expect(response.body.description).toBe('Updated description');
    });

    it('deve negar update de tabela de outro dono para MANAGER (403)', async () => {
      // Dono da tabela e outra pessoa; o MANAGER nao e dono nem membro e o
      // binding UPDATE_TABLE e NOBODY (default) — "editar apenas a sua".
      const owner = await User.create({
        name: 'Owner',
        email: `owner-${Date.now()}@example.com`,
        password: 'irrelevant',
        status: E_USER_STATUS.ACTIVE,
      });

      const { cookies } = await createAuthenticatedUserInGroup({
        groupSlug: 'manager',
        groupName: 'Manager',
        // Manager tem a capacidade UPDATE_TABLE, mas ela nao basta: acoes
        // por-tabela passam por dono/membro/binding, nao pela capacidade.
        permissionSlugs: [
          E_TABLE_PERMISSION.VIEW_TABLE,
          E_TABLE_PERMISSION.UPDATE_TABLE,
          E_TABLE_PERMISSION.REMOVE_TABLE,
          E_TABLE_PERMISSION.CREATE_TABLE,
        ],
      });

      const field = await Field.create({
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
        name: 'Other Field',
        slug: 'other-field',
        type: E_FIELD_TYPE.TEXT_SHORT,
        widthInForm: null,
        widthInList: null,
        widthInDetail: null,
      });

      const table = await Table.create({
        owner: owner._id.toString(),
        fieldOrderForm: [],
        fieldOrderList: [],
        style: E_TABLE_STYLE.LIST,
        name: 'Foreign Table',
        slug: 'foreign-table',
        fields: [field._id.toString()],
        _schema: schemaBuilder.build([
          { ...field.toJSON(), _id: field._id.toString() },
        ]),
        description: 'Owned by someone else',
        logo: null,
        methods: {
          beforeSave: { code: null },
          afterSave: { code: null },
          onLoad: { code: null },
        },
        type: E_TABLE_TYPE.TABLE,
      });

      const response = await supertest(kernel.server)
        .put(`/tables/${table.slug}`)
        .set('Cookie', cookies)
        .send({
          name: 'Hijacked Table',
          description: 'nope',
          logo: null,
          style: E_TABLE_STYLE.LIST,
          fieldOrderList: [],
          fieldOrderForm: [],
          methods: {
            beforeSave: { code: null },
            afterSave: { code: null },
            onLoad: { code: null },
          },
        });

      expect(response.statusCode).toBe(403);
      expect(response.body.cause).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });
});
