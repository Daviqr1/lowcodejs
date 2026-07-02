// Spec constrói mocks parciais de entidades do domínio via asserção.
/* eslint-disable @typescript-eslint/consistent-type-assertions */
import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildFieldPermissions,
  E_FIELD_TYPE,
  E_TABLE_STYLE,
  type IField,
} from '@application/core/entity.core';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';

import TableRowAutoSaveUseCase from './auto-save.use-case';

let tableRepo: TableInMemoryRepository;
let rowRepo: RowInMemoryRepository;
let sut: TableRowAutoSaveUseCase;

const buildField = (overrides: Partial<IField>): IField =>
  ({
    _id: overrides.slug ?? 'f',
    name: 'Field',
    slug: 'field',
    type: E_FIELD_TYPE.TEXT_SHORT,
    required: false,
    multiple: false,
    format: null,
    showInFilter: false,
    permissions: buildFieldPermissions(true, true, true),
    widthInForm: null,
    widthInList: 10,
    widthInDetail: null,
    defaultValue: null,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
    native: false,
    locked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    trashed: false,
    trashedAt: null,
    ...overrides,
  }) as IField;

async function seedTable(fields: IField[]): Promise<void> {
  await tableRepo.create({
    name: 'Filmes',
    slug: 'filmes',
    _schema: {},
    fields: fields as unknown as string[],
    owner: 'owner-id',
    style: E_TABLE_STYLE.LIST,
    fieldOrderList: [],
    fieldOrderForm: [],
  });
}

describe('Table Row Auto Save Use Case', () => {
  beforeEach(() => {
    tableRepo = new TableInMemoryRepository();
    rowRepo = new RowInMemoryRepository();
    sut = new TableRowAutoSaveUseCase(tableRepo, rowRepo);
  });

  it('deve salvar como rascunho quando obrigatorio e string vazia', async () => {
    await seedTable([
      buildField({ name: 'Titulo', slug: 'titulo', required: true }),
    ]);

    const result = await sut.execute({ slug: 'filmes', titulo: '' });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.status).toBe('draft');
      expect(result.value.draftAt).not.toBeNull();
      // Auto-save nunca envia para a lixeira.
      expect(result.value.trashedAt).toBeNull();
      // Persiste o dado parcial real, sem placeholders.
      expect(result.value.titulo).toBe('');
    }
  });

  it('deve salvar como rascunho quando obrigatorio e null', async () => {
    await seedTable([
      buildField({ name: 'Titulo', slug: 'titulo', required: true }),
    ]);

    const result = await sut.execute({ slug: 'filmes', titulo: null });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.status).toBe('draft');
      expect(result.value.trashedAt).toBeNull();
    }
  });

  it('deve manter rascunho mesmo com obrigatorios preenchidos (auto-save nunca publica)', async () => {
    await seedTable([
      buildField({ name: 'Titulo', slug: 'titulo', required: true }),
    ]);

    const result = await sut.execute({ slug: 'filmes', titulo: 'Matrix' });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.status).toBe('draft');
      expect(result.value.trashedAt).toBeNull();
      expect(result.value.titulo).toBe('Matrix');
    }
  });

  it('deve manter rascunho ao atualizar via auto-save', async () => {
    await seedTable([
      buildField({ name: 'Titulo', slug: 'titulo', required: true }),
    ]);

    const draft = await sut.execute({ slug: 'filmes', titulo: '' });
    expect(draft.isRight()).toBe(true);
    if (!draft.isRight()) return;
    expect(draft.value.status).toBe('draft');

    const updated = await sut.execute({
      slug: 'filmes',
      _id: draft.value._id,
      titulo: 'Matrix',
    });

    expect(updated.isRight()).toBe(true);
    if (updated.isRight()) {
      expect(updated.value.status).toBe('draft');
      expect(updated.value.trashedAt).toBeNull();
      expect(updated.value.titulo).toBe('Matrix');
    }
  });

  it('deve retornar erro quando a tabela nao existe', async () => {
    const result = await sut.execute({ slug: 'inexistente' });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.cause).toBe('TABLE_NOT_FOUND');
    }
  });
});
