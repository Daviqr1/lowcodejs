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

async function makeDocumentTableWithCategory(ownerId: string): Promise<{
  field: InstanceType<typeof Field>;
  table: InstanceType<typeof Table>;
}> {
  const fieldPayload: FieldCreatePayload = {
    category: [
      {
        id: 'a',
        label: 'A',
        children: [{ id: 'a1', label: 'A1', children: [] }],
      },
      { id: 'b', label: 'B', children: [] },
    ],
    dropdown: [],
    defaultValue: null,
    showInFilter: true,
    format: null,
    group: null,
    permissions: buildFieldPermissions(true, true, true),
    locked: false,
    allowCreateRelationshipRecords: false,
    multiple: true,
    required: false,
    relationship: null,
    name: 'Categorias',
    slug: 'categorias',
    type: E_FIELD_TYPE.CATEGORY,
    widthInForm: 50,
    widthInList: 10,
    widthInDetail: null,
  };

  const field = await Field.create(fieldPayload);

  const tablePayload: TableCreatePayload = {
    owner: ownerId,
    fieldOrderForm: [],
    fieldOrderList: [],
    style: E_TABLE_STYLE.DOCUMENT,
    name: 'Artigos',
    slug: 'artigos',
    fields: [field._id.toString()],
    _schema: schemaBuilder.build([
      { ...field.toJSON(), _id: field._id.toString() },
    ]),
    description: 'Artigos',
    logo: null,
    methods: {
      beforeSave: { code: null },
      afterSave: { code: null },
      onLoad: { code: null },
    },
    type: E_TABLE_TYPE.TABLE,
  };

  const table = await Table.create(tablePayload);

  return { field, table };
}

describe('E2E Table Field Delete Category Controller', () => {
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

  describe('DELETE /tables/:slug/fields/:_id/category/:categoryId', () => {
    it('deve remover o no e descendentes e desvincular os registros', async () => {
      const { cookies, user } = await createAuthenticatedUser();
      const { field, table } = await makeDocumentTableWithCategory(user._id);

      await supertest(kernel.server)
        .post(`/tables/${table.slug}/rows`)
        .set('Cookie', cookies)
        .send({ categorias: ['a1'] });

      await supertest(kernel.server)
        .post(`/tables/${table.slug}/rows`)
        .set('Cookie', cookies)
        .send({ categorias: ['b'] });

      const response = await supertest(kernel.server)
        .delete(
          `/tables/${table.slug}/fields/${field._id.toString()}/category/a`,
        )
        .set('Cookie', cookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.removedIds.sort()).toEqual(['a', 'a1']);
      expect(response.body.field.category).toHaveLength(1);
      expect(response.body.field.category[0].id).toBe('b');

      const rows = await supertest(kernel.server)
        .get(`/tables/${table.slug}/rows/paginated`)
        .set('Cookie', cookies);

      const records = rows.body.data;
      const linkedToRemoved = records.find(
        (row: { categorias?: string[] }) =>
          Array.isArray(row.categorias) && row.categorias.includes('a1'),
      );
      expect(linkedToRemoved).toBeUndefined();

      const untouched = records.find(
        (row: { categorias?: string[] }) =>
          Array.isArray(row.categorias) && row.categorias.includes('b'),
      );
      expect(untouched).toBeTruthy();
    });

    it('deve retornar 404 CATEGORY_NOT_FOUND quando o no nao existir', async () => {
      const { cookies, user } = await createAuthenticatedUser();
      const { field, table } = await makeDocumentTableWithCategory(user._id);

      const response = await supertest(kernel.server)
        .delete(
          `/tables/${table.slug}/fields/${field._id.toString()}/category/inexistente`,
        )
        .set('Cookie', cookies);

      expect(response.statusCode).toBe(404);
      expect(response.body.cause).toBe('CATEGORY_NOT_FOUND');
    });
  });
});
