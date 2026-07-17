import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  buildFieldPermissions,
  E_FIELD_TYPE,
  E_REACTION_TYPE,
  E_TABLE_STYLE,
  E_TABLE_TYPE,
} from '@application/core/entity.core';
import { Field } from '@application/model/field.model';
import { Reaction } from '@application/model/reaction.model';
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

describe('E2E Table Row Reaction Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
    await Table.deleteMany({});
    await Field.deleteMany({});
    await Reaction.deleteMany({});

    await cleanDynamicCollections();
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('POST /tables/:slug/rows/:_id/reaction', () => {
    it('deve adicionar reacao com sucesso', async () => {
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
        name: 'Likes',
        slug: 'likes',
        type: E_FIELD_TYPE.REACTION,
        widthInForm: null,
        widthInList: null,
        widthInDetail: null,
      };

      const reactionField = await Field.create(fieldPayload);

      const tablePayload: TableCreatePayload = {
        owner: user._id,
        fieldOrderForm: [],
        fieldOrderList: [],
        style: E_TABLE_STYLE.LIST,
        name: 'Posts',
        slug: 'posts',
        fields: [reactionField._id.toString()],
        _schema: schemaBuilder.build([
          {
            ...reactionField.toJSON(),
            _id: reactionField._id.toString(),
          },
        ]),
        description: 'Posts table',
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
        .post('/tables/posts/rows')
        .set('Cookie', cookies)
        .send({});

      const rowId = createResponse.body._id;

      const response = await supertest(kernel.server)
        .post(`/tables/${tablePayload.slug}/rows/${rowId}/reaction`)
        .set('Cookie', cookies)
        .send({
          type: E_REACTION_TYPE.LIKE,
          field: reactionField._id.toString(),
          user: user._id.toString(),
        });

      expect(response.statusCode).toBe(200);
    });
  });
});
