import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildFieldPermissions,
  E_FIELD_TYPE,
  E_TABLE_STYLE,
} from '@application/core/entity.core';
import FieldInMemoryRepository from '@application/repositories/field/field-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import UserGroupInMemoryRepository from '@application/repositories/user-group/user-group-in-memory.repository';
import SlugService from '@application/services/slug/slug.service';
import InMemorySchemaBuilder from '@application/services/table/in-memory-schema-builder.service';
import { makeTextShortField } from '@test/helpers/field-factory.helper';

import SchemaImportUseCase from './schema-import.use-case';

let fieldInMemoryRepository: FieldInMemoryRepository;
let tableInMemoryRepository: TableInMemoryRepository;
let userGroupInMemoryRepository: UserGroupInMemoryRepository;
let schemaBuilder: InMemorySchemaBuilder;
let sut: SchemaImportUseCase;

const VALID_YAML = `tables:
  - name: Clientes
    fields:
      - name: Nome
        type: TEXT_SHORT
        required: true
      - name: Email
        type: TEXT_SHORT
        format: EMAIL
  - name: Pedidos
    fields:
      - name: Titulo
        type: TEXT_SHORT
        required: true
      - name: Cliente
        type: RELATIONSHIP
        relationship:
          table: clientes
          field: nome
`;

describe('Schema Import Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    fieldInMemoryRepository = new FieldInMemoryRepository();
    userGroupInMemoryRepository = new UserGroupInMemoryRepository();
    schemaBuilder = new InMemorySchemaBuilder();

    sut = new SchemaImportUseCase(
      tableInMemoryRepository,
      fieldInMemoryRepository,
      userGroupInMemoryRepository,
      schemaBuilder,
      new SlugService(),
    );
  });

  it('deve criar todas as tabelas declaradas no schema', async () => {
    const result = await sut.execute({
      yaml: VALID_YAML,
      ownerId: 'owner-id',
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.created).toHaveLength(2);
    expect(result.value.errors).toHaveLength(0);

    const clientes = result.value.created.find((t) => t.slug === 'clientes');
    const pedidos = result.value.created.find((t) => t.slug === 'pedidos');

    expect(clientes).toBeDefined();
    expect(pedidos).toBeDefined();
  });

  it('deve resolver RELATIONSHIP entre tabelas do mesmo schema', async () => {
    const result = await sut.execute({
      yaml: VALID_YAML,
      ownerId: 'owner-id',
    });

    expect(result.isRight()).toBe(true);

    const clienteField = fieldInMemoryRepository.items.find(
      (f) => f.slug === 'cliente' && f.type === E_FIELD_TYPE.RELATIONSHIP,
    );

    expect(clienteField).toBeDefined();
    expect(clienteField?.relationship).not.toBeNull();
    expect(clienteField?.relationship?.table.slug).toBe('clientes');
    expect(clienteField?.relationship?.field.slug).toBe('nome');
  });

  it('deve reportar erro quando slug ja existe e seguir criando as demais', async () => {
    const yaml = `tables:
  - name: Clientes
    fields:
      - name: Nome
        type: TEXT_SHORT
  - name: Produtos
    fields:
      - name: Titulo
        type: TEXT_SHORT
`;

    await tableInMemoryRepository.create({
      name: 'Clientes',
      slug: 'clientes',
      _schema: {},
      fields: [],
      owner: 'other-owner',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });

    const result = await sut.execute({ yaml, ownerId: 'owner-id' });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.created).toHaveLength(1);
    expect(result.value.created[0]!.slug).toBe('produtos');
    expect(result.value.errors).toHaveLength(1);
    expect(result.value.errors[0]!.name).toBe('Clientes');
    expect(result.value.errors[0]!.message).toContain('clientes');
  });

  it('deve resolver RELATIONSHIP com tabela ja existente no banco', async () => {
    const existingFieldId = 'existing-field-id';
    const existingTableId = 'existing-table-id';

    fieldInMemoryRepository.items.push({
      _id: existingFieldId,
      name: 'Codigo',
      slug: 'codigo',
      type: E_FIELD_TYPE.TEXT_SHORT,
      required: false,
      multiple: false,
      format: null,
      showInFilter: false,
      permissions: buildFieldPermissions(true, true, true),
      widthInForm: 50,
      widthInList: 10,
      widthInDetail: 50,
      defaultValue: null,
      relationship: null,
      dropdown: [],
      category: [],
      group: null,
      native: false,
      locked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      trashed: false,
      trashedAt: null,
    });

    const cidades = await tableInMemoryRepository.create({
      name: 'Cidades',
      slug: 'cidades',
      _schema: {},
      owner: 'other-owner',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
    });
    cidades._id = existingTableId;
    // simula fields populados (mongoose)
    cidades.fields = [
      { ...makeTextShortField(), _id: existingFieldId, slug: 'codigo' },
    ];

    const yaml = `tables:
  - name: Enderecos
    fields:
      - name: Cidade
        type: RELATIONSHIP
        relationship:
          table: cidades
          field: codigo
`;

    const result = await sut.execute({ yaml, ownerId: 'owner-id' });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.created).toHaveLength(1);
    expect(result.value.errors).toHaveLength(0);

    const relField = fieldInMemoryRepository.items.find(
      (f) => f.slug === 'cidade' && f.type === E_FIELD_TYPE.RELATIONSHIP,
    );
    expect(relField?.relationship?.table.slug).toBe('cidades');
    expect(relField?.relationship?.field.slug).toBe('codigo');
  });

  it('deve reportar erro quando RELATIONSHIP aponta para slug inexistente', async () => {
    const yaml = `tables:
  - name: Pedidos
    fields:
      - name: Cliente
        type: RELATIONSHIP
        relationship:
          table: tabela-fantasma
          field: campo-fantasma
`;

    const result = await sut.execute({ yaml, ownerId: 'owner-id' });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.created).toHaveLength(1);
    expect(result.value.errors).toHaveLength(1);
    expect(result.value.errors[0]!.message.toLowerCase()).toContain(
      'relacionamento',
    );
  });

  it('deve aceitar format por chave do enum (DD_MM_YYYY) ou valor (dd/MM/yyyy)', async () => {
    const yaml = `tables:
  - name: Eventos
    fields:
      - name: Data Inicio
        type: DATE
        format: DD_MM_YYYY
      - name: Data Fim
        type: DATE
        format: dd/MM/yyyy
`;

    const result = await sut.execute({ yaml, ownerId: 'owner-id' });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.errors).toHaveLength(0);

    const inicio = fieldInMemoryRepository.items.find(
      (f) => f.slug === 'data-inicio',
    );
    const fim = fieldInMemoryRepository.items.find(
      (f) => f.slug === 'data-fim',
    );
    expect(inicio?.format).toBe('dd/MM/yyyy');
    expect(fim?.format).toBe('dd/MM/yyyy');
  });

  it('deve aceitar style customizado', async () => {
    const yaml = `tables:
  - name: PublicTable
    style: GALLERY
    fields:
      - name: Titulo
        type: TEXT_SHORT
`;

    const result = await sut.execute({ yaml, ownerId: 'owner-id' });

    expect(result.isRight()).toBe(true);
    const table = tableInMemoryRepository.items.find(
      (t) => t.slug === 'publictable',
    );
    expect(table?.style).toBe('GALLERY');
  });

  it('deve criar campos DROPDOWN com options inline', async () => {
    const yaml = `tables:
  - name: Tarefas
    fields:
      - name: Situacao
        type: DROPDOWN
        options:
          - label: Pendente
            color: "#f59e0b"
          - label: Concluido
            color: "#22c55e"
`;

    const result = await sut.execute({ yaml, ownerId: 'owner-id' });

    expect(result.isRight()).toBe(true);
    const statusField = fieldInMemoryRepository.items.find(
      (f) => f.slug === 'situacao',
    );
    expect(statusField?.dropdown).toHaveLength(2);
    expect(statusField?.dropdown[0]!.label).toBe('Pendente');
    expect(statusField?.dropdown[0]!.color).toBe('#f59e0b');
  });

  it('deve retornar erro INVALID_YAML quando YAML for malformado', async () => {
    const result = await sut.execute({
      yaml: 'tables: [unclosed',
      ownerId: 'owner-id',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(400);
    expect(result.value.cause).toBe('INVALID_YAML');
  });

  it('deve retornar erro INVALID_SCHEMA quando estrutura nao casar com Zod', async () => {
    const yaml = `tables:
  - name: Tabela
    fields:
      - name: Campo
        type: TIPO_QUE_NAO_EXISTE
`;

    const result = await sut.execute({ yaml, ownerId: 'owner-id' });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(400);
    expect(result.value.cause).toBe('INVALID_SCHEMA');
  });

  it('deve retornar erro OWNER_REQUIRED quando ownerId for vazio', async () => {
    const result = await sut.execute({
      yaml: VALID_YAML,
      ownerId: '',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.cause).toBe('OWNER_REQUIRED');
  });

  it('deve reportar erro quando ha tabelas com nomes duplicados no mesmo schema', async () => {
    const yaml = `tables:
  - name: Tabela A
    fields:
      - name: Campo
        type: TEXT_SHORT
  - name: Tabela A
    fields:
      - name: Outro
        type: TEXT_SHORT
`;

    const result = await sut.execute({ yaml, ownerId: 'owner-id' });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.created).toHaveLength(1);
    expect(result.value.errors).toHaveLength(1);
    expect(result.value.errors[0]!.message.toLowerCase()).toContain(
      'duplicada',
    );
  });
});
