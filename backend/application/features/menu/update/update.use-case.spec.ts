import { beforeEach, describe, expect, it } from 'vitest';

import ExtensionInMemoryRepository from '@application/repositories/extension/extension-in-memory.repository';
import MenuInMemoryRepository from '@application/repositories/menu/menu-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import SlugService from '@application/services/slug/slug.service';

import MenuUpdateUseCase from './update.use-case';

let menuInMemoryRepository: MenuInMemoryRepository;
let tableInMemoryRepository: TableInMemoryRepository;
let extensionInMemoryRepository: ExtensionInMemoryRepository;
let sut: MenuUpdateUseCase;

describe('Menu Update Use Case', () => {
  beforeEach(() => {
    menuInMemoryRepository = new MenuInMemoryRepository();
    tableInMemoryRepository = new TableInMemoryRepository();
    extensionInMemoryRepository = new ExtensionInMemoryRepository();
    sut = new MenuUpdateUseCase(
      menuInMemoryRepository,
      tableInMemoryRepository,
      extensionInMemoryRepository,
      new SlugService(),
    );
  });

  it('deve atualizar um menu com sucesso', async () => {
    const created = await menuInMemoryRepository.create({
      name: 'Dashboard',
      slug: 'dashboard',
      type: 'PAGE',
    });

    const result = await sut.execute({
      _id: created._id,
      name: 'Updated Dashboard',
      parent: null,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.name).toBe('Updated Dashboard');
    }
  });

  it('deve atualizar slug do menu', async () => {
    const created = await menuInMemoryRepository.create({
      name: 'Dashboard',
      slug: 'dashboard',
      type: 'PAGE',
    });

    const result = await sut.execute({
      _id: created._id,
      slug: 'new-dashboard',
      parent: null,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.slug).toBe('new-dashboard');
    }
  });

  it('deve manter apenas um menu inicial ao atualizar', async () => {
    const previousInitial = await menuInMemoryRepository.create({
      name: 'Anterior',
      slug: 'anterior',
      type: 'PAGE',
      isInitial: true,
    });
    const created = await menuInMemoryRepository.create({
      name: 'Novo Inicial',
      slug: 'novo-inicial',
      type: 'PAGE',
    });

    const result = await sut.execute({
      _id: created._id,
      isInitial: true,
      parent: null,
    });

    expect(result.isRight()).toBe(true);
    const previous = await menuInMemoryRepository.findById(previousInitial._id);

    if (result.isRight()) {
      expect(result.value.isInitial).toBe(true);
    }
    expect(previous?.isInitial).toBe(false);
  });

  it('deve impedir separador como menu inicial', async () => {
    const created = await menuInMemoryRepository.create({
      name: 'Separador',
      slug: 'separador',
      type: 'SEPARATOR',
    });

    const result = await sut.execute({
      _id: created._id,
      isInitial: true,
      parent: null,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(400);
      expect(result.value.cause).toBe('INVALID_PARAMETERS');
    }
  });

  it('deve retornar erro MENU_NOT_FOUND quando menu nao existe', async () => {
    const result = await sut.execute({
      _id: 'non-existent-id',
      name: 'Updated',
      parent: null,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(404);
      expect(result.value.cause).toBe('MENU_NOT_FOUND');
    }
  });

  it('deve retornar erro MENU_ALREADY_EXISTS quando novo slug ja existe', async () => {
    await menuInMemoryRepository.create({
      name: 'Existing',
      slug: 'existing',
      type: 'PAGE',
    });

    const toUpdate = await menuInMemoryRepository.create({
      name: 'To Update',
      slug: 'to-update',
      type: 'PAGE',
    });

    const result = await sut.execute({
      _id: toUpdate._id,
      slug: 'existing',
      parent: null,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(409);
      expect(result.value.cause).toBe('MENU_ALREADY_EXISTS');
    }
  });

  it('deve retornar erro INVALID_PARAMETERS quando tipo TABLE sem table', async () => {
    const created = await menuInMemoryRepository.create({
      name: 'Menu',
      slug: 'menu',
      type: 'PAGE',
    });

    const result = await sut.execute({
      _id: created._id,
      type: 'TABLE',
      parent: null,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(400);
      expect(result.value.cause).toBe('INVALID_PARAMETERS');
    }
  });

  it('deve retornar erro UPDATE_MENU_ERROR quando houver falha', async () => {
    menuInMemoryRepository.simulateError(
      'findById',
      new Error('Database error'),
    );

    const result = await sut.execute({
      _id: 'some-id',
      name: 'Updated',
      parent: null,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(500);
      expect(result.value.cause).toBe('UPDATE_MENU_ERROR');
    }
  });
});
