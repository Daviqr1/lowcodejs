import { beforeEach, describe, expect, it } from 'vitest';

import { buildFieldPermissions } from '@application/core/entity.core';
import FieldInMemoryRepository from '@application/repositories/field/field-in-memory.repository';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import InMemorySchemaBuilder from '@application/services/table/in-memory-schema-builder.service';

import CloneTableUseCase from './clone-table.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let fieldInMemoryRepository: FieldInMemoryRepository;
let rowInMemoryRepository: RowInMemoryRepository;
let schemaBuilder: InMemorySchemaBuilder;
let sut: CloneTableUseCase;

describe('Clone Table Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    fieldInMemoryRepository = new FieldInMemoryRepository();
    rowInMemoryRepository = new RowInMemoryRepository();

    schemaBuilder = new InMemorySchemaBuilder();

    sut = new CloneTableUseCase(
      tableInMemoryRepository,
      fieldInMemoryRepository,
      rowInMemoryRepository,
      schemaBuilder,
    );
  });

  it('deve clonar uma tabela com sucesso', async () => {
    const baseTable = await tableInMemoryRepository.create({
      name: 'Tabela Original',
      slug: 'tabela-original',
      type: 'TABLE',
      owner: 'owner-id',
      style: 'LIST',
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    const result = await sut.execute({
      baseTableId: baseTable._id,
      name: 'Tabela Clonada',
      ownerId: 'new-owner-id',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.table.name).toBe('Tabela Clonada');
    expect(result.value.table.slug).toBe('tabela-clonada');
    expect(result.value.table._id).not.toBe(baseTable._id);
  });

  it('deve clonar multiplas tabelas e remapear relacionamentos entre clones', async () => {
    const targetField = await fieldInMemoryRepository.create({
      name: 'Nome',
      slug: 'nome',
      type: 'TEXT_SHORT',
      required: false,
      multiple: false,
      format: null,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      defaultValue: null,
      locked: false,
      relationship: null,
      dropdown: [],
      category: [],
      group: null,
      widthInForm: null,
      widthInList: null,
      widthInDetail: null,
    });

    const targetTable = await tableInMemoryRepository.create({
      name: 'Tabela Alvo',
      slug: 'tabela-alvo',
      type: 'TABLE',
      owner: 'owner-id',
      style: 'LIST',
      fields: [targetField._id],
    });
    targetTable.fields = [targetField];

    const relationshipField = await fieldInMemoryRepository.create({
      name: 'Relacionamento',
      slug: 'relacionamento',
      type: 'RELATIONSHIP',
      required: false,
      multiple: false,
      format: null,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      defaultValue: null,
      locked: false,
      relationship: {
        table: {
          _id: targetTable._id,
          slug: targetTable.slug,
        },
        field: {
          _id: targetField._id,
          slug: targetField.slug,
        },
        order: 'asc',
      },
      dropdown: [],
      category: [],
      group: null,
      widthInForm: null,
      widthInList: null,
      widthInDetail: null,
    });

    const sourceTable = await tableInMemoryRepository.create({
      name: 'Tabela Fonte',
      slug: 'tabela-fonte',
      type: 'TABLE',
      owner: 'owner-id',
      style: 'LIST',
      fields: [relationshipField._id],
    });
    sourceTable.fields = [relationshipField];

    const result = await sut.execute({
      baseTableIds: [sourceTable._id, targetTable._id],
      name: 'clone_1_',
      ownerId: 'new-owner-id',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.tables).toHaveLength(2);

    const clonedSource = result.value.tables?.find(
      (table) => table.name === 'clone_1_Tabela Fonte',
    );
    const clonedTarget = result.value.tables?.find(
      (table) => table.name === 'clone_1_Tabela Alvo',
    );

    expect(clonedSource).toBeTruthy();
    expect(clonedTarget).toBeTruthy();

    const clonedRelationshipFieldId =
      result.value.fieldIdMaps?.[sourceTable._id][relationshipField._id];
    const clonedTargetFieldId =
      result.value.fieldIdMaps?.[targetTable._id][targetField._id];

    const clonedRelationshipField = await fieldInMemoryRepository.findById(
      clonedRelationshipFieldId!,
    );

    expect(clonedRelationshipField?.relationship?.table).toEqual({
      _id: clonedTarget?._id,
      slug: clonedTarget?.slug,
    });
    expect(clonedRelationshipField?.relationship?.field).toEqual({
      _id: clonedTargetFieldId,
      slug: targetField.slug,
    });
  });

  it('deve gerar nome automaticamente quando nome nao for informado', async () => {
    const baseTable = await tableInMemoryRepository.create({
      name: 'Tabela Original',
      slug: 'tabela-original',
      type: 'TABLE',
      owner: 'owner-id',
      style: 'LIST',
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    const result = await sut.execute({
      baseTableId: baseTable._id,
      name: '',
      ownerId: 'new-owner-id',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.table.name).toBe('Clone de Tabela Original');
    expect(result.value.table.slug).toBe('clone-de-tabela-original');
  });

  it('deve copiar dados somente das tabelas selecionadas', async () => {
    const tableWithData = await tableInMemoryRepository.create({
      name: 'Tabela Com Dados',
      slug: 'tabela-com-dados',
      type: 'TABLE',
      owner: 'owner-id',
      style: 'LIST',
    });

    const tableWithoutData = await tableInMemoryRepository.create({
      name: 'Tabela Sem Dados',
      slug: 'tabela-sem-dados',
      type: 'TABLE',
      owner: 'owner-id',
      style: 'LIST',
    });

    await rowInMemoryRepository.create({
      table: tableWithData,
      data: { nome: 'Registro copiado' },
    });
    await rowInMemoryRepository.create({
      table: tableWithoutData,
      data: { nome: 'Registro ignorado' },
    });

    const result = await sut.execute({
      baseTableIds: [tableWithData._id, tableWithoutData._id],
      copyDataTableIds: [tableWithData._id],
      name: '',
      ownerId: 'new-owner-id',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    const clonedWithData = result.value.tables?.find(
      (table) => table.name === 'Clone de Tabela Com Dados',
    );
    const clonedWithoutData = result.value.tables?.find(
      (table) => table.name === 'Clone de Tabela Sem Dados',
    );

    const copiedRows = await rowInMemoryRepository.findAllRaw(clonedWithData!);
    const ignoredRows = await rowInMemoryRepository.findAllRaw(
      clonedWithoutData!,
    );

    expect(copiedRows).toHaveLength(1);
    expect(copiedRows[0].nome).toBe('Registro copiado');
    expect(ignoredRows).toHaveLength(0);
  });

  it('deve clonar tabelas relacionadas e remapear ids dos dados relacionados', async () => {
    const targetField = await fieldInMemoryRepository.create({
      name: 'Nome',
      slug: 'nome',
      type: 'TEXT_SHORT',
      required: false,
      multiple: false,
      format: null,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      defaultValue: null,
      locked: false,
      relationship: null,
      dropdown: [],
      category: [],
      group: null,
      widthInForm: null,
      widthInList: null,
      widthInDetail: null,
    });

    const targetTable = await tableInMemoryRepository.create({
      name: 'Tabela A',
      slug: 'tabela-a',
      type: 'TABLE',
      owner: 'owner-id',
      style: 'LIST',
      fields: [targetField._id],
    });
    targetTable.fields = [targetField];

    const relationshipField = await fieldInMemoryRepository.create({
      name: 'Relacionamento A',
      slug: 'relacionamento-a',
      type: 'RELATIONSHIP',
      required: false,
      multiple: false,
      format: null,
      permissions: buildFieldPermissions(true, true, true),
      showInFilter: true,
      defaultValue: null,
      locked: false,
      relationship: {
        table: {
          _id: targetTable._id,
          slug: targetTable.slug,
        },
        field: {
          _id: targetField._id,
          slug: targetField.slug,
        },
        order: 'asc',
      },
      dropdown: [],
      category: [],
      group: null,
      widthInForm: null,
      widthInList: null,
      widthInDetail: null,
    });

    const sourceTable = await tableInMemoryRepository.create({
      name: 'Tabela AC',
      slug: 'tabela-ac',
      type: 'TABLE',
      owner: 'owner-id',
      style: 'LIST',
      fields: [relationshipField._id],
    });
    sourceTable.fields = [relationshipField];

    const targetRow = await rowInMemoryRepository.create({
      table: targetTable,
      data: { nome: 'Registro A' },
    });
    await rowInMemoryRepository.create({
      table: sourceTable,
      data: { 'relacionamento-a': [targetRow._id] },
    });

    const result = await sut.execute({
      baseTableIds: [sourceTable._id],
      copyDataTableIds: [sourceTable._id],
      name: 'teste_',
      ownerId: 'new-owner-id',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    const clonedSource = result.value.tables?.find(
      (table) => table.name === 'teste_Tabela AC',
    );
    const clonedTarget = result.value.tables?.find(
      (table) => table.name === 'teste_Tabela A',
    );

    expect(clonedSource).toBeTruthy();
    expect(clonedTarget).toBeTruthy();

    const clonedTargetRows = await rowInMemoryRepository.findAllRaw(
      clonedTarget!,
    );
    const clonedSourceRows = await rowInMemoryRepository.findAllRaw(
      clonedSource!,
    );

    expect(clonedTargetRows).toHaveLength(1);
    expect(clonedSourceRows).toHaveLength(1);
    expect(clonedTargetRows[0]._id).not.toBe(targetRow._id);
    expect(clonedSourceRows[0]['relacionamento-a']).toEqual([
      clonedTargetRows[0]._id,
    ]);
  });

  it('deve retornar erro TABLE_NOT_FOUND quando tabela base nao existe', async () => {
    const result = await sut.execute({
      baseTableId: 'non-existent-id',
      name: 'Nova Tabela',
      ownerId: 'owner-id',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('TABLE_NOT_FOUND');
    expect(result.value.message).toBe('Tabela base não encontrada');
  });

  it('deve retornar erro CLONE_TABLE_ERROR quando houver falha', async () => {
    tableInMemoryRepository.simulateError(
      'findById',
      new Error('Database error'),
    );

    const result = await sut.execute({
      baseTableId: 'some-id',
      name: 'Nova Tabela',
      ownerId: 'owner-id',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('CLONE_TABLE_ERROR');
    expect(result.value.message).toBe('Erro ao clonar tabela');
  });

  it('deve gerar novo owner na tabela clonada', async () => {
    const baseTable = await tableInMemoryRepository.create({
      name: 'Tabela Original',
      slug: 'tabela-original',
      type: 'TABLE',
      owner: 'old-owner-id',
      style: 'LIST',
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    const result = await sut.execute({
      baseTableId: baseTable._id,
      name: 'Tabela Clonada',
      ownerId: 'new-owner-id',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.table.owner?._id).toBe('new-owner-id');
  });

  it('deve retornar erro TABLE_ALREADY_EXISTS quando slug ja existe', async () => {
    await tableInMemoryRepository.create({
      name: 'Tabela Existente',
      slug: 'tabela-existente',
      type: 'TABLE',
      owner: 'owner-id',
      style: 'LIST',
    });

    const result = await sut.execute({
      baseTableId: 'qualquer-id',
      name: 'Tabela Existente',
      ownerId: 'owner-id',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(409);
    expect(result.value.cause).toBe('TABLE_ALREADY_EXISTS');
    expect(result.value.errors).toEqual({
      name: 'Já existe uma tabela com este nome',
    });
  });

  it('deve retornar erro OWNER_ID_REQUIRED quando ownerId nao for informado', async () => {
    const result = await sut.execute({
      baseTableId: 'some-id',
      name: 'Nova Tabela',
      ownerId: '',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(400);
    expect(result.value.cause).toBe('OWNER_ID_REQUIRED');
    expect(result.value.message).toBe('Owner ID é obrigatório');
  });
});
