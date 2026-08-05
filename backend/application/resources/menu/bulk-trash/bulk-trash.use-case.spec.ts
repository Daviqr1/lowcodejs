import { beforeEach, describe, expect, it } from 'vitest';

import MenuInMemoryRepository from '@application/repositories/menu/menu-in-memory.repository';
import TrashService from '@application/services/trash/trash.service';

import MenuBulkTrashUseCase from './bulk-trash.use-case';

let menuInMemoryRepository: MenuInMemoryRepository;
let sut: MenuBulkTrashUseCase;

describe('Menu Bulk Trash Use Case', () => {
  beforeEach(() => {
    menuInMemoryRepository = new MenuInMemoryRepository();
    sut = new MenuBulkTrashUseCase(menuInMemoryRepository, new TrashService());
  });

  it('deve enviar multiplos menus para lixeira com sucesso', async () => {
    const menu1 = await menuInMemoryRepository.create({
      name: 'Dashboard',
      slug: 'dashboard',
      type: 'PAGE',
    });
    const menu2 = await menuInMemoryRepository.create({
      name: 'Reports',
      slug: 'reports',
      type: 'PAGE',
    });

    const result = await sut.execute({ ids: [menu1._id, menu2._id] });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.modified).toBe(2);

    const trashed1 = await menuInMemoryRepository.findById(menu1._id, {
      trashed: true,
    });
    expect(trashed1?.trashed).toBe(true);
  });

  it('deve aplicar cascata em descendentes', async () => {
    const parent = await menuInMemoryRepository.create({
      name: 'Parent',
      slug: 'parent',
      type: 'SEPARATOR',
    });
    const child = await menuInMemoryRepository.create({
      name: 'Child',
      slug: 'child',
      type: 'PAGE',
      parent: parent._id,
    });

    const result = await sut.execute({ ids: [parent._id] });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.modified).toBe(2);

    const trashedChild = await menuInMemoryRepository.findById(child._id, {
      trashed: true,
    });
    expect(trashedChild?.trashed).toBe(true);
  });

  it('deve ignorar menus ja na lixeira', async () => {
    const menu = await menuInMemoryRepository.create({
      name: 'Already trashed',
      slug: 'already-trashed',
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
    expect(result.value.modified).toBe(0);
  });

  it('deve retornar erro BULK_TRASH_MENUS_ERROR quando houver falha', async () => {
    menuInMemoryRepository.simulateError(
      'updateMany',
      new Error('Database error'),
    );

    const result = await sut.execute({ ids: ['some-id'] });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('BULK_TRASH_MENUS_ERROR');
  });
});
