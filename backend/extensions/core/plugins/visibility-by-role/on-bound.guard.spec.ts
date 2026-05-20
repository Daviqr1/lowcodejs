import { describe, it, expect, beforeEach } from 'vitest';
import TableSchemaInMemoryService from '@application/services/table-schema/table-schema-in-memory.service';

import { VisibilityByRoleGuard, injectVisibilityByRoleGuardDeps } from './guard';
import FieldInMemoryRepository from '@application/repositories/field/field-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import { E_FIELD_TYPE } from '@application/core/entity.core';

describe('VisibilityByRoleGuard.onTableBound', () => {
  let fieldRepo: FieldInMemoryRepository;
  let tableRepo: TableInMemoryRepository;
  let rowRepo: RowInMemoryRepository;

  beforeEach(() => {
    fieldRepo = new FieldInMemoryRepository();
    tableRepo = new TableInMemoryRepository();
    rowRepo = new RowInMemoryRepository();
    injectVisibilityByRoleGuardDeps({ fieldRepo, tableRepo, rowRepo, tableSchemaService: new TableSchemaInMemoryService() });
  });

  it('cria field Visibilidade quando ausente, backfilla rows existentes; wasCreated=true', async () => {
    // criar tabela sem fields
    const table = await tableRepo.create({
      name: 'Processos',
      slug: 'processos',
      owner: 'u1',
      fields: [],
    });

    // criar 2 rows sem visibility — armazenadas com data no top-level pelo in-memory repo
    await rowRepo.create({ table, data: { nome: 'A' } });
    await rowRepo.create({ table, data: { nome: 'B' } });

    const result = await VisibilityByRoleGuard.onTableBound(table);
    expect(result.isRight()).toBe(true);
    expect((result.value as any).wasCreated).toBe(true);

    // field foi criado
    const fields = await fieldRepo.findMany();
    const visField = fields.find((f) => f.slug === 'visibility');
    expect(visField).toBeDefined();
    expect(visField?.type).toBe(E_FIELD_TYPE.DROPDOWN);
    expect(visField?.dropdown.some((o) => o.id === 'PUBLIC')).toBe(true);
    expect(visField?.dropdown.some((o) => o.id === 'SIGILOSO')).toBe(true);

    // table.fields contém o novo field _id
    const reloaded = await tableRepo.findById(table._id);
    const fieldIds = (reloaded?.fields ?? []).map((f) =>
      typeof f === 'string' ? f : (f as any)._id,
    );
    expect(fieldIds).toContain(visField?._id);

    // rows foram backfilled com visibility=['PUBLIC'] em top-level (DROPDOWN e array)
    const allRows = await rowRepo.findAllRaw(table);
    expect(allRows.length).toBe(2);
    expect(allRows.every((r) => JSON.stringify((r as any).visibility) === '[\"PUBLIC\"]')).toBe(true);
  });

  it('skip create quando field visibility ja existe compativel; wasCreated=false', async () => {
    // criar o field manualmente com opções PUBLIC e SIGILOSO
    const existing = await fieldRepo.create({
      name: 'Visibilidade',
      slug: 'visibility',
      type: E_FIELD_TYPE.DROPDOWN,
      required: false,
      multiple: false,
      format: null,
      showInFilter: true,
      showInForm: true,
      showInDetail: true,
      showInList: true,
      widthInForm: null,
      widthInList: null,
      widthInDetail: null,
      locked: true,
      native: false,
      defaultValue: 'PUBLIC',
      relationship: null,
      dropdown: [
        { id: 'PUBLIC', label: 'Público', color: '#22c55e' },
        { id: 'SIGILOSO', label: 'Sigiloso', color: '#ef4444' },
      ],
      allowCustomDropdownOptions: false,
      category: [],
      group: null,
    });

    const table = await tableRepo.create({
      name: 'X',
      slug: 'x',
      owner: 'u1',
      fields: [existing._id],
    });

    // onTableBound recebe o table com fields populados (como a use-case fará em produção)
    const populated = { ...table, fields: [existing] } as any;

    const result = await VisibilityByRoleGuard.onTableBound(populated);
    expect(result.isRight()).toBe(true);
    expect((result.value as any).wasCreated).toBe(false);

    // nenhum novo field criado
    const allFields = await fieldRepo.findMany();
    expect(allFields.filter((f) => f.slug === 'visibility')).toHaveLength(1);
  });

  it('retorna Conflict quando field visibility existe incompativel', async () => {
    const incompat = await fieldRepo.create({
      name: 'Visibilidade',
      slug: 'visibility',
      type: E_FIELD_TYPE.TEXT_SHORT,
      required: false,
      multiple: false,
      format: null,
      showInFilter: false,
      showInForm: true,
      showInDetail: true,
      showInList: true,
      widthInForm: null,
      widthInList: null,
      widthInDetail: null,
      locked: false,
      native: false,
      defaultValue: null,
      relationship: null,
      dropdown: [],
      allowCustomDropdownOptions: false,
      category: [],
      group: null,
    });

    const table = await tableRepo.create({
      name: 'Y',
      slug: 'y',
      owner: 'u1',
      fields: [incompat._id],
    });

    const populated = { ...table, fields: [incompat] } as any;

    const result = await VisibilityByRoleGuard.onTableBound(populated);
    expect(result.isLeft()).toBe(true);
    expect((result.value as any).code).toBe(409);
  });

  it('retorna InternalServerError quando deps nao estao injetadas', async () => {
    // Override deps para null via module-level hack
    injectVisibilityByRoleGuardDeps(null as any);

    const table = await tableRepo.create({
      name: 'Z',
      slug: 'z',
      owner: 'u1',
      fields: [],
    });

    const result = await VisibilityByRoleGuard.onTableBound(table);
    expect(result.isLeft()).toBe(true);
    expect((result.value as any).code).toBe(500);
  });

  it('backfill e idempotente: rodar 2x nao altera rows que ja tem visibility', async () => {
    const table = await tableRepo.create({
      name: 'W',
      slug: 'w',
      owner: 'u1',
      fields: [],
    });

    // criar row sem visibility
    await rowRepo.create({ table, data: { nome: 'A' } });

    // primeira execução
    await VisibilityByRoleGuard.onTableBound(table);

    // segunda execução — table agora tem fields populados após primeira execução
    // Simular table com fields populados para segunda execução
    const reloadedTable = await tableRepo.findById(table._id);
    const fieldObjs = await fieldRepo.findMany();
    const populated = { ...reloadedTable!, fields: fieldObjs } as any;

    const result2 = await VisibilityByRoleGuard.onTableBound(populated);
    expect(result2.isRight()).toBe(true);
    expect((result2.value as any).wasCreated).toBe(false);

    const allRows = await rowRepo.findAllRaw(table);
    expect(allRows.every((r) => JSON.stringify((r as any).visibility) === '[\"PUBLIC\"]')).toBe(true);
  });
});
