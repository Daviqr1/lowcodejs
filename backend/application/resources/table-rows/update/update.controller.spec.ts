import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  buildFieldPermissions,
  E_FIELD_TYPE,
  E_TABLE_PERMISSION,
  E_TABLE_PROFILE,
  E_TABLE_STYLE,
  E_TABLE_TYPE,
  FIELD_NATIVE_LIST,
  type IField,
  type ITableMember,
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

// Cria a tabela `products` (campo Name) com dono e membros informados. Usado
// pelos cenarios de acesso por perfil de membro (viewer libera, contributor
// apenas a sua).
async function buildProductsTable(
  ownerId: string,
  members: ITableMember[],
): Promise<void> {
  // Inclui os campos nativos (FIELD_NATIVE_LIST traz o campo CREATOR) alem do
  // campo Name, replicando o que `POST /tables` faz. Sem `creator` no _schema o
  // Mongoose descartaria o dono da row e o enforcement de OWN nunca casaria.
  const fields = await Field.create([
    ...FIELD_NATIVE_LIST,
    {
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
    },
  ]);

  const schemaFields: IField[] = fields.map((field): IField => {
    return { ...field.toJSON(), _id: field._id.toString() };
  });

  await Table.create({
    owner: ownerId,
    members,
    fieldOrderForm: [],
    fieldOrderList: [],
    style: E_TABLE_STYLE.LIST,
    name: 'Products',
    slug: 'products',
    fields: fields.map((field): string => field._id.toString()),
    _schema: schemaBuilder.build(schemaFields),
    description: 'Products table',
    logo: null,
    methods: {
      beforeSave: { code: null },
      afterSave: { code: null },
      onLoad: { code: null },
    },
    type: E_TABLE_TYPE.TABLE,
  });
}

describe('E2E Table Row Update Controller', () => {
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

  describe('PUT /tables/:slug/rows/:_id', () => {
    it('deve atualizar linha com sucesso', async () => {
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
        .put(`/tables/products/rows/${rowId}`)
        .set('Cookie', cookies)
        .send({ name: 'Product Updated' });

      expect(response.statusCode).toBe(200);
      expect(response.body.name).toBe('Product Updated');
    });

    it('permite update de row para membro VIEWER (planilha literal, 200)', async () => {
      const owner = await createAuthenticatedUser();
      const viewer = await createAuthenticatedUserInGroup({
        groupSlug: 'registered',
        groupName: 'Registered',
        permissionSlugs: [
          E_TABLE_PERMISSION.VIEW_TABLE,
          E_TABLE_PERMISSION.VIEW_ROW,
        ],
      });

      await buildProductsTable(owner.user._id, [
        { user: viewer.user._id, profile: E_TABLE_PROFILE.VIEWER },
      ]);

      // Dono cria a row.
      const created = await supertest(kernel.server)
        .post('/tables/products/rows')
        .set('Cookie', owner.cookies)
        .send({ name: 'Product 1' });

      // VIEWER edita → 200 (matriz libera UPDATE_ROW para o perfil viewer).
      const response = await supertest(kernel.server)
        .put(`/tables/products/rows/${created.body._id}`)
        .set('Cookie', viewer.cookies)
        .send({ name: 'Product Updated' });

      expect(response.statusCode).toBe(200);
      expect(response.body.name).toBe('Product Updated');
    });

    it('CONTRIBUTOR edita a própria row, mas não a de outro (apenas a sua)', async () => {
      const owner = await createAuthenticatedUser();
      const contributor = await createAuthenticatedUserInGroup({
        groupSlug: 'registered',
        groupName: 'Registered',
        permissionSlugs: [
          E_TABLE_PERMISSION.VIEW_TABLE,
          E_TABLE_PERMISSION.VIEW_ROW,
          E_TABLE_PERMISSION.CREATE_ROW,
          E_TABLE_PERMISSION.UPDATE_ROW,
        ],
      });

      await buildProductsTable(owner.user._id, [
        { user: contributor.user._id, profile: E_TABLE_PROFILE.CONTRIBUTOR },
      ]);

      // Row do dono.
      const ownerRow = await supertest(kernel.server)
        .post('/tables/products/rows')
        .set('Cookie', owner.cookies)
        .send({ name: 'Owner Row' });

      // Row do proprio contributor.
      const ownRow = await supertest(kernel.server)
        .post('/tables/products/rows')
        .set('Cookie', contributor.cookies)
        .send({ name: 'My Row' });

      expect(ownRow.statusCode).toBe(201);

      // Edita a propria → 200.
      const okResponse = await supertest(kernel.server)
        .put(`/tables/products/rows/${ownRow.body._id}`)
        .set('Cookie', contributor.cookies)
        .send({ name: 'My Row Updated' });

      expect(okResponse.statusCode).toBe(200);
      expect(okResponse.body.name).toBe('My Row Updated');

      // Edita a do dono → 403 OWN_ROW_ONLY.
      const deniedResponse = await supertest(kernel.server)
        .put(`/tables/products/rows/${ownerRow.body._id}`)
        .set('Cookie', contributor.cookies)
        .send({ name: 'Stolen' });

      expect(deniedResponse.statusCode).toBe(403);
      expect(deniedResponse.body.cause).toBe('OWN_ROW_ONLY');
    });
  });
});
