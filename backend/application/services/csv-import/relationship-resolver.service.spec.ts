import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildFieldPermissions,
  E_FIELD_TYPE,
  E_TABLE_STYLE,
  type IField,
} from '@application/core/entity.core';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';

import { buildRelationshipResolvers } from './relationship-resolver';

let tableRepo: TableInMemoryRepository;
let rowRepo: RowInMemoryRepository;

// Campo base RELATIONSHIP — todas as propriedades explícitas, sem cast.
const BASE_REL_FIELD: IField = {
  _id: 'f-rel',
  name: 'Relacionamento',
  slug: 'rel',
  type: E_FIELD_TYPE.RELATIONSHIP,
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
    table: { _id: 'prod-table-id', slug: 'produtos' },
    field: { _id: 'prod-name-id', slug: 'name' },
    order: 'asc',
  },
  dropdown: [],
  category: [],
  group: null,
  native: false,
  locked: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  trashed: false,
  trashedAt: null,
};

const PRODUTOS_TABLE_PAYLOAD = {
  name: 'Produtos',
  slug: 'produtos',
  _schema: {},
  fields: [],
  owner: 'owner-id',
  style: E_TABLE_STYLE.LIST,
  fieldOrderList: [],
  fieldOrderForm: [],
};

describe('buildRelationshipResolvers', () => {
  beforeEach(() => {
    tableRepo = new TableInMemoryRepository();
    rowRepo = new RowInMemoryRepository();
  });

  it('resolve display value único para ObjectId', async () => {
    const relatedTable = await tableRepo.create(PRODUTOS_TABLE_PAYLOAD);
    const row = await rowRepo.create({
      table: relatedTable,
      data: { name: 'Caneta' },
    });

    const field: IField = {
      ...BASE_REL_FIELD,
      slug: 'produto',
      _id: 'f-produto',
    };
    const fieldMap = new Map<string, IField>([['produto', field]]);
    const csvRows: Record<string, string>[] = [{ produto: 'Caneta' }];

    const resolvers = await buildRelationshipResolvers(
      csvRows,
      fieldMap,
      tableRepo,
      rowRepo,
    );

    const resolver = resolvers.get('produto');
    expect(resolver).toBeDefined();
    if (!resolver) return;

    expect(resolver('Caneta')).toEqual([row._id]);
  });

  it('resolve múltiplos itens separados por ";"', async () => {
    const relatedTable = await tableRepo.create(PRODUTOS_TABLE_PAYLOAD);
    const row1 = await rowRepo.create({
      table: relatedTable,
      data: { name: 'Caneta' },
    });
    const row2 = await rowRepo.create({
      table: relatedTable,
      data: { name: 'Lápis' },
    });

    const field: IField = {
      ...BASE_REL_FIELD,
      slug: 'produto',
      _id: 'f-produto',
    };
    const fieldMap = new Map<string, IField>([['produto', field]]);
    const csvRows: Record<string, string>[] = [{ produto: 'Caneta; Lápis' }];

    const resolvers = await buildRelationshipResolvers(
      csvRows,
      fieldMap,
      tableRepo,
      rowRepo,
    );

    const resolver = resolvers.get('produto');
    expect(resolver).toBeDefined();
    if (!resolver) return;

    const ids = resolver('Caneta; Lápis');
    expect(ids).toContain(row1._id);
    expect(ids).toContain(row2._id);
    expect(ids).toHaveLength(2);
  });

  it('passa ObjectId 24-hex diretamente sem lookup na DB', async () => {
    await tableRepo.create(PRODUTOS_TABLE_PAYLOAD);

    const fakeId = '507f1f77bcf86cd799439011';
    const field: IField = {
      ...BASE_REL_FIELD,
      slug: 'produto',
      _id: 'f-produto',
    };
    const fieldMap = new Map<string, IField>([['produto', field]]);
    const csvRows: Record<string, string>[] = [{ produto: fakeId }];

    const resolvers = await buildRelationshipResolvers(
      csvRows,
      fieldMap,
      tableRepo,
      rowRepo,
    );

    const resolver = resolvers.get('produto');
    expect(resolver).toBeDefined();
    if (!resolver) return;

    expect(resolver(fakeId)).toEqual([fakeId]);
  });

  it('retorna array vazio quando display value não encontrado na DB', async () => {
    const relatedTable = await tableRepo.create(PRODUTOS_TABLE_PAYLOAD);
    await rowRepo.create({ table: relatedTable, data: { name: 'Caneta' } });

    const field: IField = {
      ...BASE_REL_FIELD,
      slug: 'produto',
      _id: 'f-produto',
    };
    const fieldMap = new Map<string, IField>([['produto', field]]);
    const csvRows: Record<string, string>[] = [{ produto: 'Inexistente' }];

    const resolvers = await buildRelationshipResolvers(
      csvRows,
      fieldMap,
      tableRepo,
      rowRepo,
    );

    const resolver = resolvers.get('produto');
    expect(resolver).toBeDefined();
    if (!resolver) return;

    expect(resolver('Inexistente')).toEqual([]);
  });

  it('retorna resolver vazio quando tabela relacionada não existe no banco', async () => {
    // tableRepo está vazio — 'produtos' não cadastrado

    const field: IField = {
      ...BASE_REL_FIELD,
      slug: 'produto',
      _id: 'f-produto',
    };
    const fieldMap = new Map<string, IField>([['produto', field]]);
    const csvRows: Record<string, string>[] = [{ produto: 'Caneta' }];

    const resolvers = await buildRelationshipResolvers(
      csvRows,
      fieldMap,
      tableRepo,
      rowRepo,
    );

    const resolver = resolvers.get('produto');
    expect(resolver).toBeDefined();
    if (!resolver) return;

    expect(resolver('Caneta')).toEqual([]);
  });

  it('não cria resolver para campos USER (tipo não suportado pelo import)', async () => {
    const userField: IField = {
      _id: 'f-user',
      name: 'Responsável',
      slug: 'responsavel',
      type: E_FIELD_TYPE.USER,
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
      native: false,
      locked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      trashed: false,
      trashedAt: null,
    };

    const fieldMap = new Map<string, IField>([['responsavel', userField]]);
    const csvRows: Record<string, string>[] = [
      { responsavel: 'user@example.com' },
    ];

    const resolvers = await buildRelationshipResolvers(
      csvRows,
      fieldMap,
      tableRepo,
      rowRepo,
    );

    // USER não gera resolver — worker.ts coerceValue retornará undefined via isUnsupportedImportType
    expect(resolvers.has('responsavel')).toBe(false);
  });

  it('ignora coluna RELATIONSHIP sem configuração de relationship', async () => {
    const field: IField = {
      ...BASE_REL_FIELD,
      slug: 'produto',
      _id: 'f-produto',
      relationship: null,
    };
    const fieldMap = new Map<string, IField>([['produto', field]]);
    const csvRows: Record<string, string>[] = [{ produto: 'Caneta' }];

    const resolvers = await buildRelationshipResolvers(
      csvRows,
      fieldMap,
      tableRepo,
      rowRepo,
    );

    expect(resolvers.has('produto')).toBe(false);
  });

  it('resolve com lookup case-insensitive no mapa', async () => {
    const relatedTable = await tableRepo.create(PRODUTOS_TABLE_PAYLOAD);
    const row = await rowRepo.create({
      table: relatedTable,
      data: { name: 'Caneta' },
    });

    const field: IField = {
      ...BASE_REL_FIELD,
      slug: 'produto',
      _id: 'f-produto',
    };
    const fieldMap = new Map<string, IField>([['produto', field]]);
    // CSV exportado com capitalização original; resolver usa toLowerCase no mapa
    const csvRows: Record<string, string>[] = [{ produto: 'Caneta' }];

    const resolvers = await buildRelationshipResolvers(
      csvRows,
      fieldMap,
      tableRepo,
      rowRepo,
    );

    const resolver = resolvers.get('produto');
    expect(resolver).toBeDefined();
    if (!resolver) return;

    // 'caneta' (minúsculo) deve resolver via toLowerCase
    expect(resolver('caneta')).toEqual([row._id]);
  });
});
