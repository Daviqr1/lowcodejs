import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildFieldPermissions,
  E_FIELD_TYPE,
  type IField,
  type IGroupConfiguration,
} from '@application/core/entity.core';

import MongooseFieldGroupBuilder from './field-group-builder.service';

const FIELD_BASE: IField = {
  _id: 'field-id',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  trashed: false,
  trashedAt: null,
  name: 'Campo',
  slug: 'campo',
  type: E_FIELD_TYPE.TEXT_SHORT,
  permissions: buildFieldPermissions(true, true, true),
  showInFilter: false,
  locked: false,
  native: false,
  allowCreateRelationshipRecords: false,
  required: false,
  multiple: false,
  category: [],
  dropdown: [],
  defaultValue: null,
  format: null,
  relationship: null,
  group: null,
  widthInForm: 50,
  widthInList: 10,
  widthInDetail: null,
};

function makeField(partial: Partial<IField>): IField {
  return {
    ...FIELD_BASE,
    ...partial,
  };
}

// O grupo "endereco" com um campo de texto (logradouro), um USER (responsavel) e
// um DATE (visitado-em). Campos simples nivel-unico (sem grupo-em-grupo).
const enderecoFields: IField[] = [
  makeField({
    _id: 'gf-log',
    name: 'Logradouro',
    slug: 'logradouro',
    type: E_FIELD_TYPE.TEXT_SHORT,
  }),
  makeField({
    _id: 'gf-resp',
    name: 'Responsavel',
    slug: 'responsavel',
    type: E_FIELD_TYPE.USER,
  }),
  makeField({
    _id: 'gf-data',
    name: 'Visitado em',
    slug: 'visitado-em',
    type: E_FIELD_TYPE.DATE,
  }),
];

const enderecoGroup: IGroupConfiguration = {
  slug: 'endereco',
  name: 'Endereco',
  fields: enderecoFields,
  _schema: { logradouro: { type: 'String', required: false } },
};

const enderecoField = makeField({
  _id: 'f-endereco',
  name: 'Endereco',
  slug: 'endereco',
  type: E_FIELD_TYPE.FIELD_GROUP,
  group: { slug: 'endereco' },
});

let sut: MongooseFieldGroupBuilder;

beforeEach(() => {
  sut = new MongooseFieldGroupBuilder();
});

describe('FieldGroupBuilder.buildEmbeddedSchema', () => {
  it('monta o entry embedded a partir do _schema do grupo', () => {
    const result = sut.buildEmbeddedSchema(enderecoField, [enderecoGroup]);

    expect(result).toEqual({
      endereco: [
        {
          type: 'Embedded',
          schema: enderecoGroup._schema,
          required: false,
        },
      ],
    });
  });

  it('cai para schema vazio quando o grupo nao e encontrado', () => {
    const result = sut.buildEmbeddedSchema(enderecoField, []);

    expect(result.endereco[0].schema).toEqual({});
  });
});

describe('FieldGroupBuilder.buildPopulate', () => {
  it('gera populate em dot notation para USER dentro do grupo', () => {
    const result = sut.buildPopulate([enderecoField], [enderecoGroup]);

    const paths = result.map((p) => p.path);
    expect(paths).toContain('endereco.responsavel');
  });

  it('ignora campos nao populaveis (texto/date) e campos fora de grupo', () => {
    const result = sut.buildPopulate([enderecoField], [enderecoGroup]);

    const paths = result.map((p) => p.path);
    expect(paths).not.toContain('endereco.logradouro');
    expect(paths).not.toContain('endereco.visitado-em');
    expect(result).toHaveLength(1);
  });
});

describe('FieldGroupBuilder.buildFilter', () => {
  it('monta filtro $regex em dot notation para texto dentro do grupo', () => {
    const filter = sut.buildFilter(
      { 'endereco-logradouro': 'rua' },
      [enderecoField],
      [enderecoGroup],
    );

    expect(filter['endereco.logradouro']).toMatchObject({ $options: 'i' });
  });

  it('monta intervalo de data para campo DATE dentro do grupo', () => {
    // O ramo de DATE em grupo so e avaliado quando a chave base do campo esta
    // presente no payload (gate herdado do query-builder original); ai os
    // limites `-initial`/`-final` viram $gte/$lte.
    const filter = sut.buildFilter(
      {
        'endereco-visitado-em': '',
        'endereco-visitado-em-initial': '2026-01-01',
      },
      [enderecoField],
      [enderecoGroup],
    );

    expect(filter['endereco.visitado-em']).toHaveProperty('$gte');
  });

  it('retorna vazio quando o payload nao tem chave de grupo', () => {
    const filter = sut.buildFilter(
      { outro: 'x' },
      [enderecoField],
      [enderecoGroup],
    );

    expect(filter).toEqual({});
  });
});

describe('FieldGroupBuilder.buildSearch', () => {
  it('inclui clausula de busca textual para campos de texto do grupo', () => {
    const clauses = sut.buildSearch('rua', [enderecoField], [enderecoGroup]);

    const paths = clauses.flatMap((c) => Object.keys(c));
    expect(paths).toContain('endereco.logradouro');
  });

  it('retorna vazio quando nao ha grupos', () => {
    const clauses = sut.buildSearch('rua', [enderecoField], undefined);

    expect(clauses).toEqual([]);
  });
});
