import { beforeEach, describe, expect, it } from 'vitest';

import MenuInMemoryRepository from '@application/repositories/menu/menu-in-memory.repository';

import MenuSendToTrashUseCase from './send-to-trash.use-case';

let menuInMemoryRepository: MenuInMemoryRepository;
let sut: MenuSendToTrashUseCase;

describe('Menu Send To Trash Use Case', () => {
  beforeEach(() => {
    menuInMemoryRepository = new MenuInMemoryRepository();
    sut = new MenuSendToTrashUseCase(menuInMemoryRepository);
  });

  it('deve enviar um menu para a lixeira com sucesso', async () => {
    const created = await menuInMemoryRepository.create({
      name: 'Dashboard',
      slug: 'dashboard',
      type: 'PAGE',
    });

    const result = await sut.execute({ _id: created._id });

    expect(result.isRight()).toBe(true);

    const trashed = await menuInMemoryRepository.findById(created._id, {
      trashed: true,
    });
    expect(trashed?.trashed).toBe(true);
    expect(trashed?.trashedAt).toBeTruthy();
  });

  it('deve retornar erro MENU_NOT_FOUND quando menu nao existe', async () => {
    const result = await sut.execute({ _id: 'non-existent-id' });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(404);
      expect(result.value.cause).toBe('MENU_NOT_FOUND');
    }
  });

  it('deve retornar erro MENU_HAS_CHILDREN quando menu tem filhos ativos', async () => {
    const parent = await menuInMemoryRepository.create({
      name: 'Parent',
      slug: 'parent',
      type: 'SEPARATOR',
    });

    await menuInMemoryRepository.create({
      name: 'Child',
      slug: 'child',
      type: 'PAGE',
      parent: parent._id,
    });

    const result = await sut.execute({ _id: parent._id });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(409);
      expect(result.value.cause).toBe('MENU_HAS_CHILDREN');
    }
  });

  it('deve retornar erro SEND_TO_TRASH_MENU_ERROR quando houver falha', async () => {
    menuInMemoryRepository.simulateError(
      'findById',
      new Error('Database error'),
    );

    const result = await sut.execute({ _id: 'some-id' });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(500);
      expect(result.value.cause).toBe('SEND_TO_TRASH_MENU_ERROR');
    }
  });
});
