import { beforeEach, describe, expect, it } from 'vitest';

import MenuInMemoryRepository from '@application/repositories/menu/menu-in-memory.repository';

import MenuReorderUseCase from './reorder.use-case';

let menuInMemoryRepository: MenuInMemoryRepository;
let sut: MenuReorderUseCase;

describe('Menu Reorder Use Case', () => {
  beforeEach(() => {
    menuInMemoryRepository = new MenuInMemoryRepository();
    sut = new MenuReorderUseCase(menuInMemoryRepository);
  });

  it('deve reordenar menus com sucesso', async () => {
    const menu1 = await menuInMemoryRepository.create({
      name: 'Dashboard',
      slug: 'dashboard',
      type: 'PAGE',
      order: 0,
    });

    const menu2 = await menuInMemoryRepository.create({
      name: 'Configuracoes',
      slug: 'configuracoes',
      type: 'PAGE',
      order: 1,
    });

    const result = await sut.execute({
      items: [
        { _id: menu1._id, order: 1 },
        { _id: menu2._id, order: 0 },
      ],
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value).toBeNull();

    const updatedMenu1 = await menuInMemoryRepository.findById(menu1._id);
    const updatedMenu2 = await menuInMemoryRepository.findById(menu2._id);
    expect(updatedMenu1).not.toBeNull();
    expect(updatedMenu2).not.toBeNull();
    if (!updatedMenu1 || !updatedMenu2) throw new Error('Expected menus');
    expect(updatedMenu1.order).toBe(1);
    expect(updatedMenu2.order).toBe(0);
  });

  it('deve retornar erro INVALID_PARAMETERS quando lista de items esta vazia', async () => {
    const result = await sut.execute({ items: [] });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(400);
    expect(result.value.cause).toBe('INVALID_PARAMETERS');
  });

  it('deve retornar erro MENU_NOT_FOUND quando algum menu nao existe', async () => {
    const result = await sut.execute({
      items: [{ _id: 'non-existent-id', order: 0 }],
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('MENU_NOT_FOUND');
  });

  it('deve retornar erro INVALID_PARAMETERS quando items tem parents diferentes', async () => {
    const parent1 = await menuInMemoryRepository.create({
      name: 'Parent 1',
      slug: 'parent-1',
      type: 'SEPARATOR',
    });

    const parent2 = await menuInMemoryRepository.create({
      name: 'Parent 2',
      slug: 'parent-2',
      type: 'SEPARATOR',
    });

    const child1 = await menuInMemoryRepository.create({
      name: 'Child 1',
      slug: 'child-1',
      type: 'PAGE',
      parent: parent1._id,
    });

    const child2 = await menuInMemoryRepository.create({
      name: 'Child 2',
      slug: 'child-2',
      type: 'PAGE',
      parent: parent2._id,
    });

    const result = await sut.execute({
      items: [
        { _id: child1._id, order: 0 },
        { _id: child2._id, order: 1 },
      ],
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(400);
    expect(result.value.cause).toBe('INVALID_PARAMETERS');
  });

  it('deve mover menu para outro pai quando parent for informado', async () => {
    const parent1 = await menuInMemoryRepository.create({
      name: 'Parent 1',
      slug: 'parent-1',
      type: 'SEPARATOR',
    });

    const parent2 = await menuInMemoryRepository.create({
      name: 'Parent 2',
      slug: 'parent-2',
      type: 'SEPARATOR',
    });

    const child = await menuInMemoryRepository.create({
      name: 'Child',
      slug: 'child',
      type: 'PAGE',
      parent: parent1._id,
      order: 0,
    });

    const result = await sut.execute({
      items: [{ _id: child._id, parent: parent2._id, order: 1 }],
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    const updatedChild = await menuInMemoryRepository.findById(child._id);
    expect(updatedChild).not.toBeNull();
    if (!updatedChild) throw new Error('Expected child');
    expect(updatedChild.parent).toBe(parent2._id);
    expect(updatedChild.order).toBe(1);
  });

  it('deve retornar erro INVALID_PARAMETERS quando parent gera ciclo', async () => {
    const parent = await menuInMemoryRepository.create({
      name: 'Parent',
      slug: 'parent',
      type: 'SEPARATOR',
    });

    const child = await menuInMemoryRepository.create({
      name: 'Child',
      slug: 'child',
      type: 'SEPARATOR',
      parent: parent._id,
    });

    const result = await sut.execute({
      items: [
        { _id: parent._id, parent: child._id, order: 0 },
        { _id: child._id, parent: parent._id, order: 0 },
      ],
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(400);
    expect(result.value.cause).toBe('INVALID_PARAMETERS');
  });

  it('deve retornar erro REORDER_MENU_ERROR quando houver falha', async () => {
    menuInMemoryRepository.simulateError(
      'findById',
      new Error('Database error'),
    );

    const result = await sut.execute({
      items: [{ _id: 'some-id', order: 0 }],
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('REORDER_MENU_ERROR');
  });
});
