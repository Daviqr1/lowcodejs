import { beforeEach, describe, expect, it } from 'vitest';

import MenuInMemoryRepository from '@application/repositories/menu/menu-in-memory.repository';
import TrashService from '@application/services/trash/trash.service';

import MenuEmptyTrashUseCase from './empty-trash.use-case';

let menuInMemoryRepository: MenuInMemoryRepository;
let sut: MenuEmptyTrashUseCase;

describe('Menu Empty Trash Use Case', () => {
  beforeEach(() => {
    menuInMemoryRepository = new MenuInMemoryRepository();
    sut = new MenuEmptyTrashUseCase(menuInMemoryRepository, new TrashService());
  });

  it('deve esvaziar a lixeira removendo todos os menus trashed', async () => {
    const m1 = await menuInMemoryRepository.create({
      name: 'A',
      slug: 'a',
      type: 'PAGE',
    });
    const m2 = await menuInMemoryRepository.create({
      name: 'B',
      slug: 'b',
      type: 'PAGE',
    });
    await menuInMemoryRepository.update({
      _id: m1._id,
      trashed: true,
      trashedAt: new Date(),
    });
    await menuInMemoryRepository.update({
      _id: m2._id,
      trashed: true,
      trashedAt: new Date(),
    });

    const result = await sut.execute();

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.deleted).toBe(2);
  });

  it('deve retornar 0 quando lixeira esta vazia', async () => {
    const result = await sut.execute();
    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.deleted).toBe(0);
  });

  it('deve preservar menus nao-trashed', async () => {
    await menuInMemoryRepository.create({
      name: 'Active',
      slug: 'active',
      type: 'PAGE',
    });

    const result = await sut.execute();

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.deleted).toBe(0);

    const list = await menuInMemoryRepository.findMany();
    expect(list.length).toBe(1);
  });

  it('deve retornar erro EMPTY_TRASH_MENUS_ERROR quando houver falha', async () => {
    menuInMemoryRepository.simulateError(
      'findManyTrashed',
      new Error('Database error'),
    );

    const result = await sut.execute();

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('EMPTY_TRASH_MENUS_ERROR');
  });
});
