import { beforeEach, describe, expect, it } from 'vitest';

import ExtensionInMemoryRepository from '@application/repositories/extension/extension-in-memory.repository';
import MenuInMemoryRepository from '@application/repositories/menu/menu-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import SlugService from '@application/services/slug/slug.service';

import MenuCreateUseCase from './create.use-case';

let menuInMemoryRepository: MenuInMemoryRepository;
let tableInMemoryRepository: TableInMemoryRepository;
let extensionInMemoryRepository: ExtensionInMemoryRepository;
let sut: MenuCreateUseCase;

describe('Menu Create Use Case', () => {
  beforeEach(() => {
    menuInMemoryRepository = new MenuInMemoryRepository();
    tableInMemoryRepository = new TableInMemoryRepository();
    extensionInMemoryRepository = new ExtensionInMemoryRepository();
    sut = new MenuCreateUseCase(
      menuInMemoryRepository,
      tableInMemoryRepository,
      extensionInMemoryRepository,
      new SlugService(),
    );
  });

  it('deve criar um menu com sucesso', async () => {
    const result = await sut.execute({
      name: 'Dashboard',
      slug: 'dashboard',
      type: 'PAGE',
      parent: null,
      owner: 'test-user-id',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.name).toBe('Dashboard');
      expect(result.value.slug).toBe('dashboard');
      expect(result.value.type).toBe('PAGE');
      expect(result.value.url).toBe('/pages/dashboard');
    }
  });

  it('deve criar um menu do tipo EXTERNAL', async () => {
    const result = await sut.execute({
      name: 'Google',
      slug: 'google',
      type: 'EXTERNAL',
      url: 'https://google.com',
      parent: null,
      owner: 'test-user-id',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.name).toBe('Google');
      expect(result.value.type).toBe('EXTERNAL');
      expect(result.value.url).toBe('https://google.com');
    }
  });

  it('deve respeitar a posicao informada ao criar menu', async () => {
    const result = await sut.execute({
      name: 'Requisitos',
      slug: 'requisitos',
      type: 'SEPARATOR',
      parent: null,
      order: 3,
      owner: 'test-user-id',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.order).toBe(3);
    }
  });

  it('deve manter apenas um menu inicial ao criar', async () => {
    const previousInitial = await menuInMemoryRepository.create({
      name: 'Anterior',
      slug: 'anterior',
      type: 'PAGE',
      isInitial: true,
    });

    const result = await sut.execute({
      name: 'Novo Inicial',
      slug: 'novo-inicial',
      type: 'PAGE',
      parent: null,
      isInitial: true,
      owner: 'test-user-id',
    });

    expect(result.isRight()).toBe(true);
    const previous = await menuInMemoryRepository.findById(previousInitial._id);

    if (result.isRight()) {
      expect(result.value.isInitial).toBe(true);
    }
    expect(previous?.isInitial).toBe(false);
  });

  it('deve impedir separador como menu inicial', async () => {
    const result = await sut.execute({
      name: 'Separador',
      slug: 'separador',
      type: 'SEPARATOR',
      parent: null,
      isInitial: true,
      owner: 'test-user-id',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(400);
      expect(result.value.cause).toBe('INVALID_PARAMETERS');
    }
  });

  it('deve retornar erro MENU_ALREADY_EXISTS quando slug ja existe', async () => {
    await menuInMemoryRepository.create({
      name: 'Existing Menu',
      slug: 'existing',
      type: 'PAGE',
    });

    const result = await sut.execute({
      name: 'New Menu',
      slug: 'existing',
      type: 'PAGE',
      parent: null,
      owner: 'test-user-id',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(409);
      expect(result.value.cause).toBe('MENU_ALREADY_EXISTS');
      expect(result.value.errors).toEqual({
        name: 'Menu já existe',
      });
    }
  });

  it('deve retornar erro PARENT_MENU_NOT_FOUND quando parent nao existe', async () => {
    const result = await sut.execute({
      name: 'Sub Menu',
      slug: 'sub-menu',
      type: 'PAGE',
      parent: 'non-existent-id',
      owner: 'test-user-id',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(404);
      expect(result.value.cause).toBe('PARENT_MENU_NOT_FOUND');
    }
  });

  it('deve retornar erro INVALID_PARAMETERS quando tipo TABLE sem table', async () => {
    const result = await sut.execute({
      name: 'Table Menu',
      slug: 'table-menu',
      type: 'TABLE',
      parent: null,
      owner: 'test-user-id',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(400);
      expect(result.value.cause).toBe('INVALID_PARAMETERS');
    }
  });

  it('deve retornar erro CREATE_MENU_ERROR quando houver falha', async () => {
    menuInMemoryRepository.simulateError(
      'findBySlug',
      new Error('Database error'),
    );

    const result = await sut.execute({
      name: 'Menu',
      slug: 'menu',
      type: 'PAGE',
      parent: null,
      owner: 'test-user-id',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(500);
      expect(result.value.cause).toBe('CREATE_MENU_ERROR');
    }
  });
});
