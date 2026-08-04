import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildFieldPermissions,
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  E_TABLE_STYLE,
  type IField,
} from '@application/core/entity.core';
import FieldInMemoryRepository from '@application/repositories/field/field-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import FieldValueService from '@application/services/field-value/field-value.service';
import SlugService from '@application/services/slug/slug.service';
import InMemoryModelBuilder from '@application/services/table/in-memory-model-builder.service';
import InMemorySchemaBuilder from '@application/services/table/in-memory-schema-builder.service';

import { TableFieldCreateSchema } from '../../table-fields/create/create.schema';
import { TableFieldUpdateSchema } from '../../table-fields/update/update.schema';
import { GroupFieldCreateSchema } from '../create/create.schema';

import { GroupFieldUpdateSchema } from './update.schema';
import GroupFieldUpdateUseCase from './update.use-case';

let tableRepository: TableInMemoryRepository;
let fieldRepository: FieldInMemoryRepository;
let schemaBuilder: InMemorySchemaBuilder;
let modelBuilder: InMemoryModelBuilder;
let sut: GroupFieldUpdateUseCase;

const TABLE_DEFAULTS = {
  _schema: {},
  fields: [],
  owner: 'owner-id',
  style: E_TABLE_STYLE.LIST,
  fieldOrderList: [],
  fieldOrderForm: [],
};

const FIELD_CREATE_PAYLOAD = {
  name: 'Rua',
  slug: 'rua',
  type: E_FIELD_TYPE.TEXT_SHORT,
  permissions: buildFieldPermissions(true, true, true),
  showInFilter: true,
  locked: false,
  allowCreateRelationshipRecords: false,
  native: false,
  required: false,
  category: [],
  dropdown: [],
  defaultValue: null,
  format: E_FIELD_FORMAT.ALPHA_NUMERIC,
  group: null,
  multiple: false,
  relationship: null,
  widthInForm: 50,
  widthInList: 10,
  widthInDetail: null,
};

// O Fastify roda AJV com `useDefaults: true`: uma flag com `default` declarado e
// preenchida quando o body a omite. Como as duas telas mandam PUT parcial (cada
// uma com so a flag que conhece), um `default: false` aqui faz elas se apagarem
// mutuamente. Este bloco guarda a causa raiz — o unit test do use-case nao passa
// pelo AJV e nao pegaria a regressao.
describe('Schemas de campo — flags de listagem do grupo sem default AJV', () => {
  const SCHEMAS = {
    'table-group-fields/update': GroupFieldUpdateSchema,
    'table-group-fields/create': GroupFieldCreateSchema,
    'table-fields/update': TableFieldUpdateSchema,
    'table-fields/create': TableFieldCreateSchema,
  };

  function declaredDefaults(body: unknown): Record<string, unknown> {
    const properties = Reflect.get(Object(body), 'properties');
    const result: Record<string, unknown> = {};
    for (const key of ['showInParentList', 'visibleInParentList']) {
      result[key] = Reflect.get(
        Object(Reflect.get(Object(properties), key)),
        'default',
      );
    }
    return result;
  }

  for (const [name, schema] of Object.entries(SCHEMAS)) {
    it(`${name}: flag ausente no body nao vira false`, () => {
      expect(declaredDefaults(schema.body)).toEqual({
        showInParentList: undefined,
        visibleInParentList: undefined,
      });
    });
  }
});

describe('Group Field Update Use Case', () => {
  beforeEach(() => {
    tableRepository = new TableInMemoryRepository();
    fieldRepository = new FieldInMemoryRepository();
    schemaBuilder = new InMemorySchemaBuilder();
    modelBuilder = new InMemoryModelBuilder();

    sut = new GroupFieldUpdateUseCase(
      tableRepository,
      fieldRepository,
      schemaBuilder,
      modelBuilder,
      new SlugService(),
      new FieldValueService(),
    );
  });

  // Cria o campo-filho ja com as flags no estado desejado e a tabela pai com o
  // grupo `endereco` apontando para ele.
  async function createFieldInGroup(flags: {
    showInParentList: boolean;
    visibleInParentList: boolean;
  }): Promise<IField> {
    const field = await fieldRepository.create({
      ...FIELD_CREATE_PAYLOAD,
      ...flags,
    });

    await tableRepository.create({
      ...TABLE_DEFAULTS,
      name: 'Clientes',
      slug: 'clientes',
      groups: [
        { slug: 'endereco', name: 'Endereco', fields: [field], _schema: {} },
      ],
    });

    return field;
  }

  // Payload valido de update; o caller passa so as flags que aquela tela envia
  // (as omitidas ficam ausentes, como no PUT real).
  function updatePayload(overrides: {
    fieldId: string;
    showInParentList?: boolean;
    visibleInParentList?: boolean;
  }): Parameters<typeof sut.execute>[0] {
    return {
      slug: 'clientes',
      groupSlug: 'endereco',
      name: 'Rua',
      type: E_FIELD_TYPE.TEXT_SHORT,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      locked: false,
      allowCreateRelationshipRecords: false,
      required: false,
      category: [],
      dropdown: [],
      defaultValue: null,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
      group: null,
      multiple: false,
      relationship: null,
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: null,
      trashed: false,
      trashedAt: null,
      htmlContent: null,
      ...overrides,
    };
  }

  it('deve atualizar campo do grupo com sucesso', async () => {
    const field = await fieldRepository.create(FIELD_CREATE_PAYLOAD);

    await tableRepository.create({
      ...TABLE_DEFAULTS,
      name: 'Clientes',
      slug: 'clientes',
      groups: [
        {
          slug: 'endereco',
          name: 'Endereco',
          fields: [field],
          _schema: {},
        },
      ],
    });

    const result = await sut.execute({
      slug: 'clientes',
      groupSlug: 'endereco',
      fieldId: field._id,
      name: 'Avenida',
      type: E_FIELD_TYPE.TEXT_SHORT,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      locked: false,
      allowCreateRelationshipRecords: false,
      required: false,
      category: [],
      dropdown: [],
      defaultValue: null,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
      group: null,
      multiple: false,
      relationship: null,
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: null,
      trashed: false,
      trashedAt: null,
      htmlContent: null,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.name).toBe('Avenida');
    expect(result.value.slug).toBe('avenida');

    const updatedField = await fieldRepository.findById(field._id);
    expect(updatedField?.name).toBe('Avenida');
    expect(updatedField?.slug).toBe('avenida');
  });

  it('deve persistir as flags de exibicao na listagem geral (campo-filho)', async () => {
    const field = await fieldRepository.create(FIELD_CREATE_PAYLOAD);

    await tableRepository.create({
      ...TABLE_DEFAULTS,
      name: 'Clientes',
      slug: 'clientes',
      groups: [
        {
          slug: 'endereco',
          name: 'Endereco',
          fields: [field],
          _schema: {},
        },
      ],
    });

    const result = await sut.execute({
      slug: 'clientes',
      groupSlug: 'endereco',
      fieldId: field._id,
      name: 'Rua',
      type: E_FIELD_TYPE.TEXT_SHORT,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      showInParentList: true,
      visibleInParentList: true,
      locked: false,
      allowCreateRelationshipRecords: false,
      required: false,
      category: [],
      dropdown: [],
      defaultValue: null,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
      group: null,
      multiple: false,
      relationship: null,
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: null,
      trashed: false,
      trashedAt: null,
      htmlContent: null,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.showInParentList).toBe(true);
    expect(result.value.visibleInParentList).toBe(true);

    const updatedField = await fieldRepository.findById(field._id);
    expect(updatedField?.showInParentList).toBe(true);
    expect(updatedField?.visibleInParentList).toBe(true);
  });

  it('nao deve apagar visibleInParentList quando o caller omite a flag', async () => {
    const field = await createFieldInGroup({
      showInParentList: true,
      visibleInParentList: true,
    });

    // Payload do form de edicao do campo: manda showInParentList, omite a outra.
    const result = await sut.execute(
      updatePayload({ fieldId: field._id, showInParentList: true }),
    );

    expect(result.isRight()).toBe(true);
    const updatedField = await fieldRepository.findById(field._id);
    expect(updatedField?.showInParentList).toBe(true);
    expect(updatedField?.visibleInParentList).toBe(true);
  });

  it('nao deve apagar showInParentList quando o caller omite a flag', async () => {
    const field = await createFieldInGroup({
      showInParentList: true,
      visibleInParentList: true,
    });

    // Payload do olho em Gerenciar: manda visibleInParentList, omite a outra.
    const result = await sut.execute(
      updatePayload({ fieldId: field._id, visibleInParentList: false }),
    );

    expect(result.isRight()).toBe(true);
    const updatedField = await fieldRepository.findById(field._id);
    expect(updatedField?.showInParentList).toBe(true);
    expect(updatedField?.visibleInParentList).toBe(false);
  });

  it('deve revelar a coluna na transicao off->on de showInParentList', async () => {
    const field = await createFieldInGroup({
      showInParentList: false,
      visibleInParentList: false,
    });

    const result = await sut.execute(
      updatePayload({ fieldId: field._id, showInParentList: true }),
    );

    expect(result.isRight()).toBe(true);
    const updatedField = await fieldRepository.findById(field._id);
    expect(updatedField?.visibleInParentList).toBe(true);
  });

  it('nao deve reverter um ocultar quando showInParentList ja estava ligado', async () => {
    const field = await createFieldInGroup({
      showInParentList: true,
      visibleInParentList: false,
    });

    const result = await sut.execute(
      updatePayload({ fieldId: field._id, showInParentList: true }),
    );

    expect(result.isRight()).toBe(true);
    const updatedField = await fieldRepository.findById(field._id);
    expect(updatedField?.visibleInParentList).toBe(false);
  });

  it('deve retornar TABLE_NOT_FOUND quando tabela nao existe', async () => {
    const result = await sut.execute({
      slug: 'inexistente',
      groupSlug: 'endereco',
      fieldId: 'field-id',
      name: 'Rua',
      type: E_FIELD_TYPE.TEXT_SHORT,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      locked: false,
      allowCreateRelationshipRecords: false,
      required: false,
      category: [],
      dropdown: [],
      defaultValue: null,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
      group: null,
      multiple: false,
      relationship: null,
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: null,
      trashed: false,
      trashedAt: null,
      htmlContent: null,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('TABLE_NOT_FOUND');
    expect(result.value.message).toBe('Tabela não encontrada');
  });

  it('deve retornar GROUP_NOT_FOUND quando grupo nao existe', async () => {
    await tableRepository.create({
      ...TABLE_DEFAULTS,
      name: 'Clientes',
      slug: 'clientes',
      groups: [],
    });

    const result = await sut.execute({
      slug: 'clientes',
      groupSlug: 'inexistente',
      fieldId: 'field-id',
      name: 'Rua',
      type: E_FIELD_TYPE.TEXT_SHORT,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      locked: false,
      allowCreateRelationshipRecords: false,
      required: false,
      category: [],
      dropdown: [],
      defaultValue: null,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
      group: null,
      multiple: false,
      relationship: null,
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: null,
      trashed: false,
      trashedAt: null,
      htmlContent: null,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('GROUP_NOT_FOUND');
    expect(result.value.message).toBe('Grupo não encontrado');
  });

  it('deve retornar FIELD_NOT_FOUND quando campo nao existe', async () => {
    await tableRepository.create({
      ...TABLE_DEFAULTS,
      name: 'Clientes',
      slug: 'clientes',
      groups: [
        {
          slug: 'endereco',
          name: 'Endereco',
          fields: [],
          _schema: {},
        },
      ],
    });

    const result = await sut.execute({
      slug: 'clientes',
      groupSlug: 'endereco',
      fieldId: 'campo-inexistente',
      name: 'Rua',
      type: E_FIELD_TYPE.TEXT_SHORT,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      locked: false,
      allowCreateRelationshipRecords: false,
      required: false,
      category: [],
      dropdown: [],
      defaultValue: null,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
      group: null,
      multiple: false,
      relationship: null,
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: null,
      trashed: false,
      trashedAt: null,
      htmlContent: null,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('FIELD_NOT_FOUND');
    expect(result.value.message).toBe('Campo não encontrado');
  });

  it('deve retornar UPDATE_GROUP_FIELD_ERROR quando repository falha', async () => {
    tableRepository.simulateError('findBySlug', new Error('Database error'));

    const result = await sut.execute({
      slug: 'clientes',
      groupSlug: 'endereco',
      fieldId: 'field-id',
      name: 'Rua',
      type: E_FIELD_TYPE.TEXT_SHORT,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      locked: false,
      allowCreateRelationshipRecords: false,
      required: false,
      category: [],
      dropdown: [],
      defaultValue: null,
      format: E_FIELD_FORMAT.ALPHA_NUMERIC,
      group: null,
      multiple: false,
      relationship: null,
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: null,
      trashed: false,
      trashedAt: null,
      htmlContent: null,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('UPDATE_GROUP_FIELD_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');
  });
});
