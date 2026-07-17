import { describe, expect, it } from 'vitest';

import {
  E_FIELD_TYPE,
  E_SCHEMA_TYPE,
  type IField,
  type IFieldConfigurationRelationship,
} from '@application/core/entity.core';

import MongooseSchemaBuilder from './schema-builder.service';

type RelationshipFieldOverrides = {
  multiple: boolean;
  side: 'source' | 'target';
  mirrorMultiple: boolean;
};

function makeRelationshipField(overrides: RelationshipFieldOverrides): IField {
  const relationship: IFieldConfigurationRelationship = {
    table: { _id: 'table-related', slug: 'related' },
    field: { _id: 'field-related', slug: 'related-field' },
    order: 'asc',
    relationshipId: 'rel-1',
    side: overrides.side,
    mirror: { multiple: overrides.mirrorMultiple, visible: true },
  };

  return {
    _id: 'field-1',
    name: 'Rel',
    slug: 'rel',
    type: E_FIELD_TYPE.RELATIONSHIP,
    required: false,
    multiple: overrides.multiple,
    format: null,
    showInFilter: false,
    widthInForm: null,
    widthInList: null,
    widthInDetail: null,
    defaultValue: null,
    relationship,
    dropdown: [],
    category: [],
    group: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    trashed: false,
    trashedAt: null,
  };
}

describe('MongooseSchemaBuilder — RELATIONSHIP storage role', () => {
  const builder = new MongooseSchemaBuilder();

  it('OWNS_FK (1:1 source) declara FK single com ref, nao array', () => {
    const field = makeRelationshipField({
      multiple: false,
      side: 'source',
      mirrorMultiple: false,
    });
    const schema = builder.build([field]);
    expect(schema.rel).toEqual({
      type: E_SCHEMA_TYPE.OBJECT_ID,
      required: false,
      ref: 'table-related',
    });
  });

  it('OWNS_FK (1:N lado nao-multiplo) declara FK single', () => {
    const field = makeRelationshipField({
      multiple: false,
      side: 'source',
      mirrorMultiple: true,
    });
    const schema = builder.build([field]);
    expect(schema.rel).toEqual({
      type: E_SCHEMA_TYPE.OBJECT_ID,
      required: false,
      ref: 'table-related',
    });
  });

  it('REVERSE (1:1 target) declara array transiente', () => {
    const field = makeRelationshipField({
      multiple: false,
      side: 'target',
      mirrorMultiple: false,
    });
    const schema = builder.build([field]);
    expect(schema.rel).toEqual([
      { type: E_SCHEMA_TYPE.OBJECT_ID, required: false, ref: 'table-related' },
    ]);
  });

  it('REVERSE (1:N lado multiplo) declara array transiente', () => {
    const field = makeRelationshipField({
      multiple: true,
      side: 'source',
      mirrorMultiple: false,
    });
    const schema = builder.build([field]);
    expect(schema.rel).toEqual([
      { type: E_SCHEMA_TYPE.OBJECT_ID, required: false, ref: 'table-related' },
    ]);
  });

  it('PIVOT (N:N) declara array transiente', () => {
    const field = makeRelationshipField({
      multiple: true,
      side: 'source',
      mirrorMultiple: true,
    });
    const schema = builder.build([field]);
    expect(schema.rel).toEqual([
      { type: E_SCHEMA_TYPE.OBJECT_ID, required: false, ref: 'table-related' },
    ]);
  });

  it('fallback legado (sem side/mirror) declara array transiente', () => {
    const field = makeRelationshipField({
      multiple: false,
      side: 'source',
      mirrorMultiple: false,
    });
    field.relationship = {
      table: { _id: 'table-related', slug: 'related' },
      field: { _id: 'field-related', slug: 'related-field' },
      order: 'asc',
      relationshipId: 'rel-1',
    };
    const schema = builder.build([field]);
    expect(schema.rel).toEqual([
      { type: E_SCHEMA_TYPE.OBJECT_ID, required: false, ref: 'table-related' },
    ]);
  });
});
