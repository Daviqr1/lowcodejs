import { beforeEach, describe, expect, it } from 'vitest';

import MenuInMemoryRepository from '@application/repositories/menu/menu-in-memory.repository';
import HttpResponseService from '@application/services/http-response/http-response.service';

import MenuPaginatedUseCase from './paginated.use-case';

let menuInMemoryRepository: MenuInMemoryRepository;
let sut: MenuPaginatedUseCase;

describe('Menu Paginated Use Case', () => {
  beforeEach(() => {
    menuInMemoryRepository = new MenuInMemoryRepository();
    sut = new MenuPaginatedUseCase(
      menuInMemoryRepository,
      new HttpResponseService(),
    );
  });

  it('deve retornar lista vazia quando nao houver menus', async () => {
    const result = await sut.execute({
      page: 1,
      perPage: 20,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.data).toHaveLength(0);
      expect(result.value.meta.total).toBe(0);
    }
  });

  it('deve retornar lista de menus quando existirem', async () => {
    for (let i = 0; i < 5; i++) {
      await menuInMemoryRepository.create({
        name: `Menu ${i + 1}`,
        slug: `menu-${i + 1}`,
        type: 'PAGE',
      });
    }

    const result = await sut.execute({
      page: 1,
      perPage: 20,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.data).toHaveLength(5);
      expect(result.value.meta.total).toBe(5);
      expect(result.value.meta.page).toBe(1);
      expect(result.value.meta.perPage).toBe(20);
    }
  });

  it('deve retornar meta com paginacao correta', async () => {
    for (let i = 0; i < 25; i++) {
      await menuInMemoryRepository.create({
        name: `Menu ${i + 1}`,
        slug: `menu-${i + 1}`,
        type: 'PAGE',
      });
    }

    const result = await sut.execute({
      page: 1,
      perPage: 10,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.data).toHaveLength(10);
      expect(result.value.meta.total).toBe(25);
      expect(result.value.meta.lastPage).toBe(3);
      expect(result.value.meta.firstPage).toBe(1);
    }
  });

  it('deve filtrar menus por search', async () => {
    await menuInMemoryRepository.create({
      name: 'Dashboard',
      slug: 'dashboard',
      type: 'PAGE',
    });

    await menuInMemoryRepository.create({
      name: 'Settings',
      slug: 'settings',
      type: 'PAGE',
    });

    const result = await sut.execute({
      page: 1,
      perPage: 20,
      search: 'dash',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.data).toHaveLength(1);
      expect(result.value.data[0].name).toBe('Dashboard');
    }
  });

  it('deve ordenar menus pela posicao', async () => {
    await menuInMemoryRepository.create({
      name: 'Terceiro',
      slug: 'terceiro',
      type: 'PAGE',
      order: 3,
    });

    await menuInMemoryRepository.create({
      name: 'Primeiro',
      slug: 'primeiro',
      type: 'PAGE',
      order: 1,
    });

    const result = await sut.execute({
      page: 1,
      perPage: 20,
      'order-position': 'asc',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.data.map((menu) => menu.name)).toEqual([
        'Primeiro',
        'Terceiro',
      ]);
    }
  });

  it('deve manter filhos abaixo do respectivo menu pai ao ordenar por posicao', async () => {
    const parentOne = await menuInMemoryRepository.create({
      name: 'Menu T 01',
      slug: 'menu-t-01',
      type: 'SEPARATOR',
      order: 0,
    });

    const parentTwo = await menuInMemoryRepository.create({
      name: 'Menu T 02',
      slug: 'menu-t-02',
      type: 'SEPARATOR',
      order: 1,
    });

    await menuInMemoryRepository.create({
      name: 'Menu Sub T 1 01',
      slug: 'menu-sub-t-1-01-menu-t-01',
      type: 'TABLE',
      parent: parentOne._id,
      order: 0,
    });

    await menuInMemoryRepository.create({
      name: 'Menu Sub T 2 01',
      slug: 'menu-sub-t-2-01-menu-t-02',
      type: 'SEPARATOR',
      parent: parentTwo._id,
      order: 1,
    });

    const result = await sut.execute({
      page: 1,
      perPage: 20,
      'order-position': 'asc',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.data.map((menu) => menu.name)).toEqual([
        'Menu T 01',
        'Menu Sub T 1 01',
        'Menu T 02',
        'Menu Sub T 2 01',
      ]);
    }
  });

  it('deve retornar erro LIST_MENU_PAGINATED_ERROR quando houver falha', async () => {
    menuInMemoryRepository.simulateError(
      'findMany',
      new Error('Database error'),
    );

    const result = await sut.execute({
      page: 1,
      perPage: 20,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(500);
      expect(result.value.cause).toBe('LIST_MENU_PAGINATED_ERROR');
    }
  });
});
