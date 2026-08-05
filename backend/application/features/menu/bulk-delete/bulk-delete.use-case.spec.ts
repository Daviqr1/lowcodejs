import { beforeEach, describe, expect, it } from 'vitest';

import MenuInMemoryRepository from '@application/repositories/menu/menu-in-memory.repository';
import TrashService from '@application/services/trash/trash.service';

import MenuBulkDeleteUseCase from './bulk-delete.use-case';

let menuInMemoryRepository: MenuInMemoryRepository;
let sut: MenuBulkDeleteUseCase;

describe('Menu Bulk Delete Use Case', () => {
  beforeEach(() => {
    menuInMemoryRepository = new MenuInMemoryRepository();
    sut = new MenuBulkDeleteUseCase(menuInMemoryRepository, new TrashService());
  });

  it('deve excluir permanentemente menus na lixeira', async () => {
    const menu = await menuInMemoryRepository.create({
      name: 'A',
      slug: 'a',
      type: 'PAGE',
    });
    await menuInMemoryRepository.update({
      _id: menu._id,
      trashed: true,
      trashedAt: new Date(),
    });

    const result = await sut.execute({ ids: [menu._id] });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.deleted).toBe(1);

    const found = await menuInMemoryRepository.findById(menu._id, {
      trashed: true,
    });
    expect(found).toBeNull();
  });

  it('deve ignorar menus que nao estao na lixeira', async () => {
    const menu = await menuInMemoryRepository.create({
      name: 'Active',
      slug: 'active',
      type: 'PAGE',
    });

    const result = await sut.execute({ ids: [menu._id] });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.deleted).toBe(0);

    const found = await menuInMemoryRepository.findById(menu._id);
    expect(found).not.toBeNull();
  });

  it('deve retornar 0 quando IDs nao existem', async () => {
    const result = await sut.execute({ ids: ['x', 'y'] });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.deleted).toBe(0);
  });

  it('deve retornar erro BULK_DELETE_MENUS_ERROR quando houver falha', async () => {
    menuInMemoryRepository.simulateError(
      'findById',
      new Error('Database error'),
    );

    const result = await sut.execute({ ids: ['some-id'] });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('BULK_DELETE_MENUS_ERROR');
  });
});
