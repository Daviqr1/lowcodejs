import { beforeEach, describe, expect, it, vi } from 'vitest';

import { E_MENU_ITEM_TYPE } from '@application/core/entity.core';
import {
  buildFieldPermissions,
  E_TABLE_STYLE,
} from '@application/core/entity.core';
import FieldInMemoryRepository from '@application/repositories/field/field-in-memory.repository';
import MenuInMemoryRepository from '@application/repositories/menu/menu-in-memory.repository';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import SlugService from '@application/services/slug/slug.service';
import InMemorySchemaBuilder from '@application/services/table/in-memory-schema-builder.service';
import { makeTextShortField } from '@test/helpers/field-factory.helper';

import ImportTableUseCase from './import-table.use-case';
import InMemoryImportTableSocketService from './in-memory-import-table-socket.service';

vi.mock('slugify', () => ({
  default: vi.fn((name: string) => name.toLowerCase().replace(/\s+/g, '-')),
}));

let tableInMemoryRepository: TableInMemoryRepository;
let fieldInMemoryRepository: FieldInMemoryRepository;
let rowInMemoryRepository: RowInMemoryRepository;
let menuInMemoryRepository: MenuInMemoryRepository;
let schemaBuilder: InMemorySchemaBuilder;
let sut: ImportTableUseCase;

const baseStructure = {
  name: 'Clientes',
  slug: 'clientes',
  description: null,
  style: E_TABLE_STYLE.LIST,
  fields: [
    {
      name: 'Nome',
      slug: 'nome',
      type: 'TEXT_SHORT',
      required: true,
      multiple: false,
      format: 'ALPHA_NUMERIC',
      showInFilter: true,
      permissions: buildFieldPermissions(true, true, true),
      widthInForm: null,
      widthInList: null,
      widthInDetail: null,
      defaultValue: null,
      relationship: null,
      dropdown: [],
      category: [],
      group: null,
    },
  ],
  groups: [],
  fieldOrderList: ['nome'],
  fieldOrderForm: ['nome'],
  fieldOrderFilter: [],
  fieldOrderDetail: [],
  layoutFields: {},
  methods: {
    onLoad: { code: null },
    beforeSave: { code: null },
    afterSave: { code: null },
  },
};

const v1FileContent = {
  header: {
    version: '1.0',
    platform: 'lowcodejs',
    tableName: 'Clientes',
    tableSlug: 'clientes',
    exportedBy: 'Admin',
    exportedAt: '2024-01-01T00:00:00.000Z',
    exportType: 'structure',
  },
  structure: baseStructure,
};

const v2FileContent = {
  header: {
    version: '2.0',
    platform: 'lowcodejs',
    tableName: 'Clientes',
    tableSlug: 'clientes',
    exportedBy: 'Admin',
    exportedAt: '2024-01-01T00:00:00.000Z',
    exportType: 'structure',
    tablesCount: 1,
    menusCount: 0,
  },
  tables: [{ structure: baseStructure }],
  menus: [],
};

describe('Import Table Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    fieldInMemoryRepository = new FieldInMemoryRepository();
    rowInMemoryRepository = new RowInMemoryRepository();
    menuInMemoryRepository = new MenuInMemoryRepository();
    schemaBuilder = new InMemorySchemaBuilder();

    sut = new ImportTableUseCase(
      tableInMemoryRepository,
      fieldInMemoryRepository,
      rowInMemoryRepository,
      menuInMemoryRepository,
      schemaBuilder,
      new SlugService(),
      new InMemoryImportTableSocketService(),
    );
  });

  it('deve importar tabela v1 (legacy) com sucesso', async () => {
    const result = await sut.execute({
      name: 'Clientes Importados',
      fileContent: v1FileContent,
      ownerId: 'owner-id',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.slug).toBe('clientes-importados');
    expect(result.value.importedFields).toBe(1);
    expect(result.value.importedRows).toBe(0);
    expect(result.value.tableId).toBeTruthy();
    expect(result.value.tables).toHaveLength(1);
    expect(result.value.importedMenus).toBe(0);
  });

  it('deve importar pacote v2 mantendo slug original quando name nao for enviado', async () => {
    const result = await sut.execute({
      name: null,
      fileContent: v2FileContent,
      ownerId: 'owner-id',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.slug).toBe('clientes');
  });

  it('deve normalizar slugs de campo legados invalidos e remapear referencias', async () => {
    const legacyStructure = {
      ...baseStructure,
      slug: 'clientes-legado',
      fields: [
        {
          ...baseStructure.fields[0],
          name: 'Telefone',
          slug: 'Telefone', // legado: maiuscula → invalido no padrao estrito
        },
      ],
      fieldOrderList: ['Telefone'],
      fieldOrderForm: ['Telefone'],
      layoutFields: { title: 'Telefone' },
    };

    const result = await sut.execute({
      name: null,
      fileContent: {
        header: { ...v2FileContent.header, tableSlug: 'clientes-legado' },
        tables: [{ structure: legacyStructure }],
        menus: [],
      },
      ownerId: 'owner-id',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.importedFields).toBe(1);

    // O campo foi criado com o slug normalizado, nao com o slug invalido.
    expect(await fieldInMemoryRepository.findBySlug('telefone')).toBeTruthy();

    const table = await tableInMemoryRepository.findBySlug('clientes-legado');
    expect(table).toBeTruthy();
    expect(table!.fields.some((f) => f.slug === 'telefone')).toBe(true);
    expect(table!.fields.some((f) => f.slug === 'Telefone')).toBe(false);
  });

  it('deve retornar erro OWNER_ID_REQUIRED quando ownerId nao fornecido', async () => {
    const result = await sut.execute({
      name: 'Clientes',
      fileContent: v1FileContent,
      ownerId: '',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(400);
    expect(result.value.cause).toBe('OWNER_ID_REQUIRED');
  });

  it('deve retornar erro INVALID_PLATFORM quando plataforma nao e lowcodejs', async () => {
    const invalidContent = {
      header: {
        ...v1FileContent.header,
        platform: 'other-platform',
      },
      structure: v1FileContent.structure,
    };

    const result = await sut.execute({
      name: 'Clientes',
      fileContent: invalidContent,
      ownerId: 'owner-id',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(400);
    expect(result.value.cause).toBe('INVALID_PLATFORM');
  });

  it('deve retornar erro TABLE_SLUG_ALREADY_EXISTS quando slug ja existe (single-table)', async () => {
    await tableInMemoryRepository.create({
      name: 'Clientes',
      slug: 'clientes',
      _schema: {},
      fields: [],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    const result = await sut.execute({
      name: 'Clientes',
      fileContent: v1FileContent,
      ownerId: 'owner-id',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(400);
    expect(result.value.cause).toBe('TABLE_SLUG_ALREADY_EXISTS');
  });

  it('deve retornar TABLE_SLUG_ALREADY_EXISTS quando o slug ja existe na lixeira', async () => {
    const trashed = await tableInMemoryRepository.create({
      name: 'Clientes',
      slug: 'clientes',
      _schema: {},
      fields: [],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });
    await tableInMemoryRepository.update({
      _id: trashed._id,
      trashed: true,
      trashedAt: new Date(),
    });

    const result = await sut.execute({
      name: 'Clientes',
      fileContent: v1FileContent,
      ownerId: 'owner-id',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(400);
    expect(result.value.cause).toBe('TABLE_SLUG_ALREADY_EXISTS');
  });

  it('deve retornar IMPORT_CONFLICTS listando tabelas e menus conflitantes', async () => {
    await tableInMemoryRepository.create({
      name: 'Clientes',
      slug: 'clientes',
      _schema: {},
      fields: [],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });
    await menuInMemoryRepository.create({
      name: 'Existente',
      slug: 'cadastros',
      type: E_MENU_ITEM_TYPE.SEPARATOR,
    });

    const fileWithMenu = {
      ...v2FileContent,
      menus: [
        {
          _originalId: 'm1',
          name: 'Cadastros',
          slug: 'cadastros',
          type: 'SEPARATOR',
          parent: null,
          url: null,
          html: null,
          order: 0,
          isInitial: false,
          tableSlug: null,
          extension: null,
        },
      ],
    };

    const result = await sut.execute({
      name: null,
      fileContent: fileWithMenu,
      ownerId: 'owner-id',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('IMPORT_CONFLICTS');
    expect(result.value.errors?.tables).toBe('clientes');
    expect(result.value.errors?.menus).toBe('cadastros');
  });

  it('deve conflitar só no item de menu folha, ignorando o menu-pai existente', async () => {
    // Pai "cadastros" já existe — deve ser reaproveitado, não conflitar.
    await menuInMemoryRepository.create({
      name: 'Cadastros',
      slug: 'cadastros',
      type: E_MENU_ITEM_TYPE.SEPARATOR,
    });
    // O item folha "menu-clientes" também já existe — esse SIM conflita.
    await menuInMemoryRepository.create({
      name: 'Clientes',
      slug: 'menu-clientes',
      type: E_MENU_ITEM_TYPE.TABLE,
    });

    const fileWithMenuTree = {
      ...v2FileContent,
      menus: [
        {
          _originalId: 'mp',
          name: 'Cadastros',
          slug: 'cadastros',
          type: 'SEPARATOR',
          parent: null,
          url: null,
          html: null,
          order: 0,
          isInitial: false,
          tableSlug: null,
          extension: null,
        },
        {
          _originalId: 'ml',
          name: 'Clientes',
          slug: 'menu-clientes',
          type: 'TABLE',
          parent: 'mp',
          url: null,
          html: null,
          order: 1,
          isInitial: false,
          tableSlug: 'clientes',
          extension: null,
        },
      ],
    };

    const result = await sut.execute({
      fileContent: fileWithMenuTree,
      ownerId: 'owner-id',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('IMPORT_CONFLICTS');
    // Só o item folha conflita; o pai "cadastros" é reaproveitado.
    expect(result.value.errors?.menus).toBe('menu-clientes');
  });

  it('deve importar renomeando o item de menu em conflito e reaproveitando o pai', async () => {
    const existingParent = await menuInMemoryRepository.create({
      name: 'Cadastros',
      slug: 'cadastros',
      type: E_MENU_ITEM_TYPE.SEPARATOR,
    });
    await menuInMemoryRepository.create({
      name: 'Clientes',
      slug: 'menu-clientes',
      type: E_MENU_ITEM_TYPE.TABLE,
    });

    const fileWithMenuTree = {
      ...v2FileContent,
      menus: [
        {
          _originalId: 'mp',
          name: 'Cadastros',
          slug: 'cadastros',
          type: 'SEPARATOR',
          parent: null,
          url: null,
          html: null,
          order: 0,
          isInitial: false,
          tableSlug: null,
          extension: null,
        },
        {
          _originalId: 'ml',
          name: 'Clientes',
          slug: 'menu-clientes',
          type: 'TABLE',
          parent: 'mp',
          url: null,
          html: null,
          order: 1,
          isInitial: false,
          tableSlug: 'clientes',
          extension: null,
        },
      ],
    };

    const result = await sut.execute({
      fileContent: fileWithMenuTree,
      menus: [{ slug: 'menu-clientes', name: 'Clientes Importado' }],
      ownerId: 'owner-id',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    // Só o item folha foi criado; o pai foi reaproveitado (não conta).
    expect(result.value.importedMenus).toBe(1);

    // O item renomeado existe com o novo slug e aponta para o pai EXISTENTE.
    const newLeaf =
      await menuInMemoryRepository.findBySlug('clientes-importado');
    expect(newLeaf).toBeTruthy();
    expect(newLeaf?.name).toBe('Clientes Importado');
    expect(newLeaf?.parent).toBe(existingParent._id);

    // Não foi criado um segundo "cadastros".
    const cadastros = menuInMemoryRepository.items.filter(
      (m) => m.slug === 'cadastros',
    );
    expect(cadastros).toHaveLength(1);
  });

  it('deve importar renomeando uma tabela em conflito via payload.tables', async () => {
    await tableInMemoryRepository.create({
      name: 'Clientes',
      slug: 'clientes',
      _schema: {},
      fields: [],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    const result = await sut.execute({
      fileContent: v2FileContent,
      tables: [{ slug: 'clientes', name: 'Clientes Novo' }],
      ownerId: 'owner-id',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.slug).toBe('clientes-novo');
    expect(result.value.tables[0].name).toBe('Clientes Novo');
  });

  it('deve renomear duas tabelas relacionadas preservando o relacionamento (estrutura e dados)', async () => {
    const tituloField = {
      name: 'Título',
      slug: 'titulo',
      type: 'TEXT_SHORT',
      required: true,
      multiple: false,
      format: 'ALPHA_NUMERIC',
      showInFilter: true,
      permissions: buildFieldPermissions(true, true, true),
      widthInForm: null,
      widthInList: null,
      widthInDetail: null,
      defaultValue: null,
      relationship: null,
      dropdown: [],
      category: [],
      group: null,
    };
    const autorField = {
      name: 'Autor',
      slug: 'autor',
      type: 'RELATIONSHIP',
      required: false,
      multiple: true,
      format: null,
      showInFilter: false,
      permissions: buildFieldPermissions(true, true, true),
      widthInForm: null,
      widthInList: null,
      widthInDetail: null,
      defaultValue: null,
      relationship: {
        tableSlug: 'autores',
        fieldSlug: 'nome',
        order: 'asc',
      },
      dropdown: [],
      category: [],
      group: null,
    };

    const autoresStructure = {
      ...baseStructure,
      name: 'Autores',
      slug: 'autores',
    };
    const livrosStructure = {
      ...baseStructure,
      name: 'Livros',
      slug: 'livros',
      fields: [tituloField, autorField],
      fieldOrderList: ['titulo', 'autor'],
      fieldOrderForm: ['titulo', 'autor'],
    };

    const fileContent = {
      header: {
        version: '2.0',
        platform: 'lowcodejs',
        tableName: 'Autores',
        tableSlug: 'autores',
        exportedBy: 'Admin',
        exportedAt: '2024-01-01T00:00:00.000Z',
        exportType: 'full',
        tablesCount: 2,
        menusCount: 0,
      },
      tables: [
        {
          structure: autoresStructure,
          data: {
            totalRows: 2,
            rows: [
              { _originalId: 'a1', nome: 'Tolkien' },
              { _originalId: 'a2', nome: 'Asimov' },
            ],
          },
        },
        {
          structure: livrosStructure,
          data: {
            totalRows: 2,
            rows: [
              { _originalId: 'l1', titulo: 'O Hobbit', autor: ['a1'] },
              { _originalId: 'l2', titulo: 'Fundação', autor: ['a1', 'a2'] },
            ],
          },
        },
      ],
      menus: [],
    };

    const result = await sut.execute({
      fileContent,
      tables: [
        { slug: 'autores', name: 'Autores Novo' },
        { slug: 'livros', name: 'Livros Novo' },
      ],
      ownerId: 'owner-id',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    const slugs = result.value.tables.map((t) => t.slug).sort();
    expect(slugs).toEqual(['autores-novo', 'livros-novo']);
    expect(result.value.importedRows).toBe(4);

    const autoresTable =
      await tableInMemoryRepository.findBySlug('autores-novo');
    const livrosTable = await tableInMemoryRepository.findBySlug('livros-novo');
    expect(autoresTable).toBeTruthy();
    expect(livrosTable).toBeTruthy();

    // O field RELATIONSHIP deve apontar para o NOVO slug/id da tabela autores.
    const relField = await fieldInMemoryRepository.findBySlug('autor');
    expect(relField?.relationship?.table.slug).toBe('autores-novo');
    expect(relField?.relationship?.table._id).toBe(autoresTable?._id);
    expect(relField?.relationship?.field.slug).toBe('nome');

    // Os VALORES de relacionamento nas rows devem ser remapeados para os
    // novos _id das rows da tabela autores renomeada.
    const autoresRows = await rowInMemoryRepository.findAllRaw(autoresTable!);
    const livrosRows = await rowInMemoryRepository.findAllRaw(livrosTable!);

    const tolkien = autoresRows.find((r) => r.nome === 'Tolkien');
    const asimov = autoresRows.find((r) => r.nome === 'Asimov');
    const hobbit = livrosRows.find((r) => r.titulo === 'O Hobbit');
    const fundacao = livrosRows.find((r) => r.titulo === 'Fundação');

    expect(tolkien).toBeTruthy();
    expect(asimov).toBeTruthy();
    expect(hobbit?.autor).toEqual([tolkien?._id]);
    expect(fundacao?.autor).toEqual([tolkien?._id, asimov?._id]);
  });

  it('deve importar campos USER e restaurar o criador (CREATOR) da row', async () => {
    const userFieldExported = {
      name: 'Adaptado por',
      slug: 'adaptado-por',
      type: 'USER',
      required: false,
      multiple: true,
      format: null,
      showInFilter: false,
      permissions: buildFieldPermissions(true, true, true),
      widthInForm: null,
      widthInList: null,
      widthInDetail: null,
      defaultValue: null,
      relationship: null,
      dropdown: [],
      category: [],
      group: null,
    };
    const structure = {
      ...baseStructure,
      name: 'Livros',
      slug: 'livros',
      fields: [userFieldExported],
      fieldOrderList: ['adaptado-por'],
      fieldOrderForm: ['adaptado-por'],
    };
    const fileContent = {
      header: {
        version: '2.0',
        platform: 'lowcodejs',
        tableName: 'Livros',
        tableSlug: 'livros',
        exportedBy: 'Admin',
        exportedAt: '2024-01-01T00:00:00.000Z',
        exportType: 'full',
        tablesCount: 1,
        menusCount: 0,
      },
      tables: [
        {
          structure,
          data: {
            totalRows: 1,
            rows: [
              {
                _originalId: 'r1',
                _originalCreator: 'user-9',
                'adaptado-por': ['user-1', 'user-2'],
              },
            ],
          },
        },
      ],
      menus: [],
    };

    const result = await sut.execute({ fileContent, ownerId: 'owner-id' });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    const livrosTable = await tableInMemoryRepository.findBySlug('livros');
    const rows = await rowInMemoryRepository.findAllRaw(livrosTable!);
    expect(rows).toHaveLength(1);
    expect(rows[0]['adaptado-por']).toEqual(['user-1', 'user-2']);
    // O criador original é restaurado (não o usuário que importou).
    expect(rows[0].creator).toBe('user-9');
  });

  it('deve retornar DUPLICATE_TABLE_SLUGS quando renomeacoes geram o mesmo slug', async () => {
    const fileContent = {
      header: {
        version: '2.0',
        platform: 'lowcodejs',
        tableName: 'A',
        tableSlug: 'tabela-a',
        exportedBy: 'Admin',
        exportedAt: '2024-01-01T00:00:00.000Z',
        exportType: 'structure',
        tablesCount: 2,
        menusCount: 0,
      },
      tables: [
        { structure: { ...baseStructure, name: 'A', slug: 'tabela-a' } },
        { structure: { ...baseStructure, name: 'B', slug: 'tabela-b' } },
      ],
      menus: [],
    };

    const result = await sut.execute({
      fileContent,
      tables: [
        { slug: 'tabela-a', name: 'Mesma' },
        { slug: 'tabela-b', name: 'Mesma' },
      ],
      ownerId: 'owner-id',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(400);
    expect(result.value.cause).toBe('DUPLICATE_TABLE_SLUGS');
    expect(result.value.errors?.tables).toBe('tabela-b');
  });

  it('deve retornar erro STRUCTURE_REQUIRED quando nao tem estrutura', async () => {
    const dataOnlyContent = {
      header: {
        ...v1FileContent.header,
        exportType: 'data',
      },
    };

    const result = await sut.execute({
      name: 'Clientes Data',
      fileContent: dataOnlyContent,
      ownerId: 'owner-id',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(400);
    expect(result.value.cause).toBe('STRUCTURE_REQUIRED');
  });

  it('deve importar somente dados em tabela existente (casa por slug)', async () => {
    const nomeField = makeTextShortField({ name: 'Nome', slug: 'nome' });
    const produtos = await tableInMemoryRepository.create({
      name: 'Produtos',
      slug: 'produtos',
      _schema: {},
      fields: [nomeField._id],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: ['nome'],
      fieldOrderForm: ['nome'],
    });
    produtos.fields = [nomeField];

    const result = await sut.execute({
      ownerId: 'owner-id',
      fileContent: {
        header: {
          version: '2.0',
          platform: 'lowcodejs',
          tableName: 'Produtos',
          tableSlug: 'produtos',
          exportedBy: 'Admin',
          exportedAt: '2024-01-01T00:00:00.000Z',
          exportType: 'data',
          tablesCount: 1,
          menusCount: 0,
        },
        tables: [
          {
            tableSlug: 'produtos',
            tableName: 'Produtos',
            data: {
              totalRows: 2,
              rows: [
                { _originalId: 'p1', nome: 'Cadeira' },
                { _originalId: 'p2', nome: 'Mesa' },
              ],
            },
          },
        ],
        menus: [],
      },
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.importedRows).toBe(2);
    expect(result.value.importedFields).toBe(0);
    expect(result.value.importedMenus).toBe(0);
    expect(result.value.slug).toBe('produtos');

    const rows = await rowInMemoryRepository.findAllRaw(produtos);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.nome).sort()).toEqual(['Cadeira', 'Mesa']);
  });

  it('deve retornar IMPORT_TABLES_NOT_FOUND quando a tabela alvo nao existe', async () => {
    const result = await sut.execute({
      ownerId: 'owner-id',
      fileContent: {
        header: {
          version: '2.0',
          platform: 'lowcodejs',
          tableName: 'Inexistente',
          tableSlug: 'inexistente',
          exportedBy: 'Admin',
          exportedAt: '2024-01-01T00:00:00.000Z',
          exportType: 'data',
          tablesCount: 1,
          menusCount: 0,
        },
        tables: [
          {
            tableSlug: 'inexistente',
            tableName: 'Inexistente',
            data: { totalRows: 1, rows: [{ _originalId: 'x1', nome: 'A' }] },
          },
        ],
        menus: [],
      },
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(400);
    expect(result.value.cause).toBe('IMPORT_TABLES_NOT_FOUND');
    expect(result.value.errors?.tables).toBe('inexistente');
  });

  it('deve retornar erro INVALID_PLATFORM quando header ausente', async () => {
    const result = await sut.execute({
      name: 'Clientes',
      fileContent: {},
      ownerId: 'owner-id',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(400);
    expect(result.value.cause).toBe('INVALID_PLATFORM');
  });

  it('deve retornar erro IMPORT_TABLE_ERROR quando houver falha', async () => {
    tableInMemoryRepository.simulateError(
      'findBySlug',
      new Error('Database error'),
    );

    const result = await sut.execute({
      name: 'Clientes',
      fileContent: v1FileContent,
      ownerId: 'owner-id',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('IMPORT_TABLE_ERROR');
  });
});
