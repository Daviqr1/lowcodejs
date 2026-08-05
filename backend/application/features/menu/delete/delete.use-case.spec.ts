import { beforeEach, describe, expect, it, vi } from 'vitest';

import MenuInMemoryRepository from '@application/repositories/menu/menu-in-memory.repository';

import MenuDeleteUseCase from './delete.use-case';

let menuInMemoryRepository: MenuInMemoryRepository;
let sut: MenuDeleteUseCase;

describe('Menu Delete Use Case', () => {
  beforeEach(() => {
    menuInMemoryRepository = new MenuInMemoryRepository();
    sut = new MenuDeleteUseCase(menuInMemoryRepository);
  });

  it('deve deletar menu permanentemente com sucesso', async () => {
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

    const deleted = await menuInMemoryRepository.findById(menu._id, {
      trashed: true,
    });
    expect(deleted).toBeNull();
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

  it('deve retornar erro DELETE_MENU_ERROR quando houver falha', async () => {
    menuInMemoryRepository.simulateError(
      'findById',
      new Error('Database error'),
    );

    const result = await sut.execute({ _id: 'some-id' });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('DELETE_MENU_ERROR');
  });
});
