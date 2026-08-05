import { beforeEach, describe, expect, it } from 'vitest';

import MenuInMemoryRepository from '@application/repositories/menu/menu-in-memory.repository';
import TrashService from '@application/services/trash/trash.service';

import MenuBulkRestoreUseCase from './bulk-restore.use-case';

let menuInMemoryRepository: MenuInMemoryRepository;
let sut: MenuBulkRestoreUseCase;

describe('Menu Bulk Restore Use Case', () => {
  beforeEach(() => {
    menuInMemoryRepository = new MenuInMemoryRepository();
    sut = new MenuBulkRestoreUseCase(
      menuInMemoryRepository,
      new TrashService(),
    );
  });

  it('deve restaurar multiplos menus da lixeira com sucesso', async () => {
    const menu1 = await menuInMemoryRepository.create({
      name: 'A',
      slug: 'a',
      type: 'PAGE',
    });
    const menu2 = await menuInMemoryRepository.create({
      name: 'B',
      slug: 'b',
      type: 'PAGE',
    });

    await menuInMemoryRepository.update({
      _id: menu1._id,
      trashed: true,
      trashedAt: new Date(),
    });
    await menuInMemoryRepository.update({
      _id: menu2._id,
      trashed: true,
      trashedAt: new Date(),
    });

    const result = await sut.execute({ ids: [menu1._id, menu2._id] });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.modified).toBe(2);

    const restored = await menuInMemoryRepository.findById(menu1._id);
    expect(restored?.trashed).toBe(false);
    expect(restored?.trashedAt).toBeNull();
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
    expect(result.value.modified).toBe(0);
  });

  it('deve retornar 0 quando IDs nao existem', async () => {
    const result = await sut.execute({ ids: ['x', 'y'] });
    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.modified).toBe(0);
  });

  it('deve retornar erro BULK_RESTORE_MENUS_ERROR quando houver falha', async () => {
    menuInMemoryRepository.simulateError(
      'updateMany',
      new Error('Database error'),
    );

    const result = await sut.execute({ ids: ['some-id'] });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('BULK_RESTORE_MENUS_ERROR');
  });
});
