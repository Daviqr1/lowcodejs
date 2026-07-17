import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  buildFieldPermissions,
  E_FIELD_TYPE,
  E_PERMISSION_TARGET,
  E_TABLE_PERMISSION,
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
import {
  createAuthenticatedUser,
  createAuthenticatedUserInGroup,
} from '@test/helpers/auth.helper';
import { cleanDynamicCollections } from '@test/helpers/database.helper';

const schemaBuilder = new MongooseSchemaBuilder();

describe('E2E Table Row Paginated Controller', () => {
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

  describe('GET /tables/:slug/rows/paginated', () => {
    it('deve listar linhas paginadas com sucesso', async () => {
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
      await supertest(kernel.server)
        .post('/tables/products/rows')
        .set('Cookie', cookies)
        .send({ name: 'Product 1' });

      const response = await supertest(kernel.server)
        .get('/tables/products/rows/paginated')
        .set('Cookie', cookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta).toBeDefined();
    });

    it('deve ocultar campo com list=NOBODY para usuário não privilegiado', async () => {
      const master = await createAuthenticatedUser();

      const registered = await createAuthenticatedUserInGroup({
        groupSlug: 'registered',
        groupName: 'Registered',
        permissionSlugs: [
          E_TABLE_PERMISSION.VIEW_TABLE,
          E_TABLE_PERMISSION.VIEW_FIELD,
          E_TABLE_PERMISSION.VIEW_ROW,
        ],
      });

      const registeredGroup = await UserGroup.findOne({ slug: 'registered' });

      const nameField = await Field.create({
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
      });

      const secretField = await Field.create({
        category: [],
        dropdown: [],
        defaultValue: null,
        showInFilter: false,
        // list=NOBODY → oculto na listagem.
        permissions: buildFieldPermissions(false, true, true),
        format: null,
        group: null,
        multiple: false,
        required: false,
        relationship: null,
        name: 'Secret',
        slug: 'secret',
        type: E_FIELD_TYPE.TEXT_SHORT,
        widthInForm: null,
        widthInList: null,
        widthInDetail: null,
      });

      const groupBinding = {
        kind: E_PERMISSION_TARGET.GROUP,
        group: registeredGroup?._id.toString() ?? null,
      };

      await Table.create({
        owner: master.user._id,
        fieldOrderForm: [],
        fieldOrderList: [],
        style: E_TABLE_STYLE.LIST,
        name: 'Secrets',
        slug: 'secrets',
        fields: [nameField._id.toString(), secretField._id.toString()],
        permissions: {
          [E_TABLE_PERMISSION.VIEW_TABLE]: groupBinding,
          [E_TABLE_PERMISSION.VIEW_ROW]: groupBinding,
        },
        _schema: schemaBuilder.build([
          { ...nameField.toJSON(), _id: nameField._id.toString() },
          { ...secretField.toJSON(), _id: secretField._id.toString() },
        ]),
        description: 'Secrets table',
        logo: null,
        methods: {
          beforeSave: { code: null },
          afterSave: { code: null },
          onLoad: { code: null },
        },
        type: E_TABLE_TYPE.TABLE,
      });

      // Dono (MASTER) cria a row com ambos os valores (sem filtro de campo).
      await supertest(kernel.server)
        .post('/tables/secrets/rows')
        .set('Cookie', master.cookies)
        .send({ name: 'Visible', secret: 'classified' });

      // Usuário REGISTERED (não dono) lê: o campo secret deve sumir.
      const response = await supertest(kernel.server)
        .get('/tables/secrets/rows/paginated')
        .set('Cookie', registered.cookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].name).toBe('Visible');
      expect(response.body.data[0].secret).toBeUndefined();
    });
  });
});
