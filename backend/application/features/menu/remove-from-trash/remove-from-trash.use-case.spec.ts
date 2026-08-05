import { beforeEach, describe, expect, it, vi } from 'vitest';

import MenuInMemoryRepository from '@application/repositories/menu/menu-in-memory.repository';

import MenuRemoveFromTrashUseCase from './remove-from-trash.use-case';

let menuInMemoryRepository: MenuInMemoryRepository;
let sut: MenuRemoveFromTrashUseCase;

describe('Menu Remove From Trash Use Case', () => {
  beforeEach(() => {
    menuInMemoryRepository = new MenuInMemoryRepository();
    sut = new MenuRemoveFromTrashUseCase(menuInMemoryRepository);
  });

  it('deve remover menu da lixeira com sucesso', async () => {
    const menu = await menuInMemoryRepository.create({
      name: 'Dashboard',
      slug: 'dashboard',
      type: 'PAGE',
    });

    await menuInMemoryRepository.update({
      _id: menu._id,
      trashed: true,
      trashedAt: new Date(),
    });

    const result = await sut.execute({ _id: menu._id });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value).toBeNull();

    const restored = await menuInMemoryRepository.findById(menu._id);
    expect(restored).not.toBeNull();
    if (!restored) throw new Error('Expected menu');
    expect(restored.trashed).toBe(false);
    expect(restored.trashedAt).toBeNull();
  });

  it('deve retornar erro MENU_NOT_FOUND quando menu nao existe', async () => {
    const result = await sut.execute({ _id: 'non-existent-id' });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('MENU_NOT_FOUND');
  });

  it('deve retornar erro NOT_TRASHED quando menu nao esta na lixeira', async () => {
    const menu = await menuInMemoryRepository.create({
      name: 'Dashboard',
      slug: 'dashboard',
      type: 'PAGE',
    });

    vi.spyOn(menuInMemoryRepository, 'findById').mockResolvedValueOnce({
      ...menu,
      trashed: false,
    });

    const result = await sut.execute({ _id: menu._id });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(409);
    expect(result.value.cause).toBe('NOT_TRASHED');
  });

  it('deve retornar erro REMOVE_FROM_TRASH_MENU_ERROR quando houver falha', async () => {
    menuInMemoryRepository.simulateError(
      'findById',
      new Error('Database error'),
    );

    const result = await sut.execute({ _id: 'some-id' });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('REMOVE_FROM_TRASH_MENU_ERROR');
  });
});
