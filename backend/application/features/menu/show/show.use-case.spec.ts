import { beforeEach, describe, expect, it } from 'vitest';

import MenuInMemoryRepository from '@application/repositories/menu/menu-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';

import MenuShowUseCase from './show.use-case';

let menuInMemoryRepository: MenuInMemoryRepository;
let tableInMemoryRepository: TableInMemoryRepository;
let sut: MenuShowUseCase;

describe('Menu Show Use Case', () => {
  beforeEach(() => {
    menuInMemoryRepository = new MenuInMemoryRepository();
    tableInMemoryRepository = new TableInMemoryRepository();
    sut = new MenuShowUseCase(menuInMemoryRepository, tableInMemoryRepository);
  });

  it('deve retornar um menu existente', async () => {
    const created = await menuInMemoryRepository.create({
      name: 'Dashboard',
      slug: 'dashboard',
      type: 'PAGE',
    });

    const result = await sut.execute({ _id: created._id });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value._id).toBe(created._id);
      expect(result.value.name).toBe('Dashboard');
      expect(result.value.slug).toBe('dashboard');
    }
  });

  it('deve retornar menu com filhos', async () => {
    const parent = await menuInMemoryRepository.create({
      name: 'Parent',
      slug: 'parent',
      type: 'SEPARATOR',
    });

    await menuInMemoryRepository.create({
      name: 'Child 1',
      slug: 'child-1',
      type: 'PAGE',
      parent: parent._id,
    });

    await menuInMemoryRepository.create({
      name: 'Child 2',
      slug: 'child-2',
      type: 'PAGE',
      parent: parent._id,
    });

    const result = await sut.execute({ _id: parent._id });

    expect(result.isRight()).toBe(true);

    if (result.isRight()) {
      expect(result.value.children).toHaveLength(2);
    }
  });

  it('deve retornar erro MENU_NOT_FOUND quando menu nao existe', async () => {
    const result = await sut.execute({ _id: 'non-existent-id' });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(404);
      expect(result.value.cause).toBe('MENU_NOT_FOUND');
    }
  });

  it('deve retornar erro GET_MENU_BY_ID_ERROR quando houver falha', async () => {
    menuInMemoryRepository.simulateError(
      'findById',
      new Error('Database error'),
    );

    const result = await sut.execute({ _id: 'some-id' });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(500);
      expect(result.value.cause).toBe('GET_MENU_BY_ID_ERROR');
    }
  });
});
