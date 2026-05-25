import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IField, IRow, ITable } from '@application/core/entity.core';
import { E_FIELD_TYPE } from '@application/core/entity.core';
import type { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import type { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import type { TableSchemaContractService } from '@application/services/table-schema/table-schema-contract.service';

import {
  DateWindowGuard,
  DATE_WINDOW_GUARD_PLUGIN_KEY,
  injectDateWindowGuardDeps,
} from './guard';

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86400000);
}

function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 86400000);
}

function makeRow(overrides: Record<string, unknown> = {}): IRow {
  return {
    _id: 'row-1',
    createdAt: new Date(),
    updatedAt: null,
    trashed: false,
    trashedAt: null,
    ...overrides,
  } as IRow;
}

function makeTable(fieldsOverride: IField[] = []): ITable {
  return {
    _id: 'table-1',
    name: 'Test',
    slug: 'test',
    fields: fieldsOverride,
    _schema: {},
    groups: [],
    fieldOrderList: [],
    fieldOrderForm: [],
    fieldOrderFilter: [],
    fieldOrderDetail: [],
    createdAt: new Date(),
    updatedAt: null,
    trashed: false,
    trashedAt: null,
  } as unknown as ITable;
}

function makeDateField(slug: string): IField {
  return {
    _id: `field-${slug}`,
    name: slug,
    slug,
    type: E_FIELD_TYPE.DATE,
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
    defaultValue: null,
    relationship: null,
    dropdown: [],
    allowCustomDropdownOptions: false,
    category: [],
    group: null,
    createdAt: new Date(),
    updatedAt: null,
    trashed: false,
    trashedAt: null,
  } as unknown as IField;
}

// ── Mock deps ─────────────────────────────────────────────────────────────────

function makeMockDeps(): {
  fieldRepo: FieldContractRepository;
  tableRepo: TableContractRepository;
  tableSchemaService: TableSchemaContractService;
} {
  const fieldRepo = {
    create: vi.fn(),
    findBySlug: vi.fn(),
  } as unknown as FieldContractRepository;

  const tableRepo = {
    update: vi.fn(),
  } as unknown as TableContractRepository;

  const tableSchemaService = {
    computeSchema: vi.fn().mockReturnValue({}),
    syncModel: vi.fn().mockResolvedValue(undefined),
  } as unknown as TableSchemaContractService;

  return { fieldRepo, tableRepo, tableSchemaService };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

describe('DateWindowGuard', () => {
  let mockDeps: ReturnType<typeof makeMockDeps>;

  beforeEach(() => {
    mockDeps = makeMockDeps();
    injectDateWindowGuardDeps(mockDeps);
  });

  // ── pluginKey ──────────────────────────────────────────────────────────────

  it('has correct pluginKey', () => {
    expect(DateWindowGuard.pluginKey).toBe(DATE_WINDOW_GUARD_PLUGIN_KEY);
    expect(DateWindowGuard.pluginKey).toBe('core:date-window-guard');
  });

  it('is restrictive category', () => {
    expect(DateWindowGuard.category).toBe('restrictive');
  });

  it('supports scope all', () => {
    expect(DateWindowGuard.supportsScopeAll).toBe(true);
  });

  // ── adjustListQuery — createdAt-sliding ────────────────────────────────────

  describe('adjustListQuery — createdAt-sliding', () => {
    it('returns $gte for 7 days ago', () => {
      const before = Date.now();
      const result = DateWindowGuard.adjustListQuery(
        {},
        undefined,
        makeTable(),
        { mode: 'createdAt-sliding', slidingDays: 7 },
      );
      const after = Date.now();

      expect(result).toHaveProperty('createdAt');
      const { createdAt } = result as { createdAt: { $gte: Date } };
      const threshold = new Date(before - 7 * 86400000);
      const thresholdAfter = new Date(after - 7 * 86400000);
      expect(createdAt.$gte.getTime()).toBeGreaterThanOrEqual(
        threshold.getTime(),
      );
      expect(createdAt.$gte.getTime()).toBeLessThanOrEqual(
        thresholdAfter.getTime(),
      );
    });

    it('returns $gte for 30 days ago', () => {
      const result = DateWindowGuard.adjustListQuery(
        {},
        undefined,
        makeTable(),
        { mode: 'createdAt-sliding', slidingDays: 30 },
      ) as { createdAt: { $gte: Date } };

      const approxThreshold = new Date(Date.now() - 30 * 86400000);
      expect(
        Math.abs(result.createdAt.$gte.getTime() - approxThreshold.getTime()),
      ).toBeLessThan(1000);
    });
  });

  // ── adjustListQuery — createdAt-fixed ─────────────────────────────────────

  describe('adjustListQuery — createdAt-fixed', () => {
    const fixedFrom = '2025-01-01T00:00:00.000Z';
    const fixedTo = '2025-12-31T23:59:59.000Z';

    it('returns $gte and $lte when both from and to provided', () => {
      const result = DateWindowGuard.adjustListQuery(
        {},
        undefined,
        makeTable(),
        { mode: 'createdAt-fixed', fixedFrom, fixedTo },
      ) as { createdAt: { $gte: Date; $lte: Date } };

      expect(result.createdAt.$gte).toEqual(new Date(fixedFrom));
      expect(result.createdAt.$lte).toEqual(new Date(fixedTo));
    });

    it('returns only $gte when fixedTo is null', () => {
      const result = DateWindowGuard.adjustListQuery(
        {},
        undefined,
        makeTable(),
        { mode: 'createdAt-fixed', fixedFrom, fixedTo: null },
      ) as { createdAt: Record<string, Date> };

      expect(result.createdAt.$gte).toEqual(new Date(fixedFrom));
      expect(result.createdAt.$lte).toBeUndefined();
    });

    it('returns only $lte when fixedFrom is null', () => {
      const result = DateWindowGuard.adjustListQuery(
        {},
        undefined,
        makeTable(),
        { mode: 'createdAt-fixed', fixedFrom: null, fixedTo },
      ) as { createdAt: Record<string, Date> };

      expect(result.createdAt.$lte).toEqual(new Date(fixedTo));
      expect(result.createdAt.$gte).toBeUndefined();
    });

    it('returns sentinel {} when both fixedFrom and fixedTo are null', () => {
      const result = DateWindowGuard.adjustListQuery(
        {},
        undefined,
        makeTable(),
        { mode: 'createdAt-fixed', fixedFrom: null, fixedTo: null },
      );

      expect(result).toEqual({});
    });
  });

  // ── adjustListQuery — field-range ─────────────────────────────────────────

  describe('adjustListQuery — field-range', () => {
    it('returns $lte on validFrom and $gte on validUntil for now', () => {
      const before = new Date();
      const result = DateWindowGuard.adjustListQuery(
        {},
        undefined,
        makeTable(),
        {
          mode: 'field-range',
          validFromSlug: 'valid_from',
          validUntilSlug: 'valid_until',
        },
      ) as Record<string, { $lte?: Date; $gte?: Date }>;

      const after = new Date();

      expect(result['valid_from'].$lte!.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(result['valid_from'].$lte!.getTime()).toBeLessThanOrEqual(
        after.getTime(),
      );
      expect(result['valid_until'].$gte!.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(result['valid_until'].$gte!.getTime()).toBeLessThanOrEqual(
        after.getTime(),
      );
    });

    it('uses custom slug names', () => {
      const result = DateWindowGuard.adjustListQuery(
        {},
        undefined,
        makeTable(),
        {
          mode: 'field-range',
          validFromSlug: 'inicio',
          validUntilSlug: 'fim',
        },
      );

      expect(result).toHaveProperty('inicio');
      expect(result).toHaveProperty('fim');
    });
  });

  // ── canRead — createdAt-sliding ───────────────────────────────────────────

  describe('canRead — createdAt-sliding', () => {
    const settings = { mode: 'createdAt-sliding' as const, slidingDays: 7 };

    it('returns abstain for row created 3 days ago (within window)', () => {
      const row = makeRow({ createdAt: daysAgo(3) });
      const result = DateWindowGuard.canRead(
        row,
        undefined,
        makeTable(),
        settings,
      );
      expect(result).toBe('abstain');
    });

    it('returns deny for row created 10 days ago (outside window)', () => {
      const row = makeRow({ createdAt: daysAgo(10) });
      const result = DateWindowGuard.canRead(
        row,
        undefined,
        makeTable(),
        settings,
      );
      expect(result).toBe('deny');
    });

    it('returns abstain when createdAt is missing (cannot evaluate)', () => {
      const row = makeRow({ createdAt: undefined });
      const result = DateWindowGuard.canRead(
        row,
        undefined,
        makeTable(),
        settings,
      );
      expect(result).toBe('abstain');
    });

    it('returns abstain for row created exactly at boundary (today)', () => {
      const row = makeRow({ createdAt: new Date() });
      const result = DateWindowGuard.canRead(
        row,
        undefined,
        makeTable(),
        settings,
      );
      expect(result).toBe('abstain');
    });
  });

  // ── canRead — createdAt-fixed ─────────────────────────────────────────────

  describe('canRead — createdAt-fixed', () => {
    const fixedFrom = '2025-01-01T00:00:00.000Z';
    const fixedTo = '2025-12-31T23:59:59.000Z';
    const settings = {
      mode: 'createdAt-fixed' as const,
      fixedFrom,
      fixedTo,
    };

    it('returns abstain for row within fixed range', () => {
      const row = makeRow({ createdAt: new Date('2025-06-15T12:00:00.000Z') });
      expect(
        DateWindowGuard.canRead(row, undefined, makeTable(), settings),
      ).toBe('abstain');
    });

    it('returns deny for row before fixedFrom', () => {
      const row = makeRow({ createdAt: new Date('2024-12-31T23:59:59.000Z') });
      expect(
        DateWindowGuard.canRead(row, undefined, makeTable(), settings),
      ).toBe('deny');
    });

    it('returns deny for row after fixedTo', () => {
      const row = makeRow({ createdAt: new Date('2026-01-01T00:00:00.000Z') });
      expect(
        DateWindowGuard.canRead(row, undefined, makeTable(), settings),
      ).toBe('deny');
    });

    it('returns abstain when createdAt missing', () => {
      const row = makeRow({ createdAt: null });
      expect(
        DateWindowGuard.canRead(row, undefined, makeTable(), settings),
      ).toBe('abstain');
    });

    it('applies only from bound when fixedTo is null', () => {
      const settingsNoTo = {
        mode: 'createdAt-fixed' as const,
        fixedFrom,
        fixedTo: null,
      };
      const rowBefore = makeRow({
        createdAt: new Date('2024-06-01T00:00:00.000Z'),
      });
      const rowAfter = makeRow({
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });
      expect(
        DateWindowGuard.canRead(
          rowBefore,
          undefined,
          makeTable(),
          settingsNoTo,
        ),
      ).toBe('deny');
      expect(
        DateWindowGuard.canRead(rowAfter, undefined, makeTable(), settingsNoTo),
      ).toBe('abstain');
    });
  });

  // ── canRead — field-range ─────────────────────────────────────────────────

  describe('canRead — field-range', () => {
    const settings = {
      mode: 'field-range' as const,
      validFromSlug: 'valid_from',
      validUntilSlug: 'valid_until',
    };

    it('returns abstain when now is within [validFrom, validUntil]', () => {
      const row = makeRow({
        valid_from: daysAgo(5),
        valid_until: daysFromNow(5),
      });
      expect(
        DateWindowGuard.canRead(row, undefined, makeTable(), settings),
      ).toBe('abstain');
    });

    it('returns deny when now is before validFrom (record not yet active)', () => {
      const row = makeRow({
        valid_from: daysFromNow(2),
        valid_until: daysFromNow(10),
      });
      expect(
        DateWindowGuard.canRead(row, undefined, makeTable(), settings),
      ).toBe('deny');
    });

    it('returns deny when now is after validUntil (record expired)', () => {
      const row = makeRow({
        valid_from: daysAgo(10),
        valid_until: daysAgo(2),
      });
      expect(
        DateWindowGuard.canRead(row, undefined, makeTable(), settings),
      ).toBe('deny');
    });

    it('returns abstain when validFrom is absent (open start)', () => {
      const row = makeRow({
        valid_from: null,
        valid_until: daysFromNow(5),
      });
      expect(
        DateWindowGuard.canRead(row, undefined, makeTable(), settings),
      ).toBe('abstain');
    });

    it('returns abstain when validUntil is absent (open end)', () => {
      const row = makeRow({
        valid_from: daysAgo(5),
        valid_until: null,
      });
      expect(
        DateWindowGuard.canRead(row, undefined, makeTable(), settings),
      ).toBe('abstain');
    });
  });

  // ── canWrite ───────────────────────────────────────────────────────────────

  describe('canWrite', () => {
    it('always returns abstain for create', () => {
      const result = DateWindowGuard.canWrite(
        null,
        undefined,
        makeTable(),
        {},
        'create',
        { mode: 'createdAt-sliding', slidingDays: 7 },
      );
      expect(result).toEqual({ decision: 'abstain' });
    });

    it('always returns abstain for update', () => {
      const result = DateWindowGuard.canWrite(
        makeRow(),
        undefined,
        makeTable(),
        {},
        'update',
        { mode: 'createdAt-fixed', fixedFrom: null, fixedTo: null },
      );
      expect(result).toEqual({ decision: 'abstain' });
    });

    it('always returns abstain for delete', () => {
      const result = DateWindowGuard.canWrite(
        makeRow(),
        undefined,
        makeTable(),
        null,
        'delete',
        { mode: 'field-range', validFromSlug: 'vf', validUntilSlug: 'vu' },
      );
      expect(result).toEqual({ decision: 'abstain' });
    });
  });

  // ── sanitizeWritePayload ───────────────────────────────────────────────────

  describe('sanitizeWritePayload', () => {
    it('returns payload unchanged (identity) for sliding mode', () => {
      const payload = { title: 'foo', value: 42 };
      const result = DateWindowGuard.sanitizeWritePayload(
        payload,
        undefined,
        makeTable(),
        'create',
        null,
        { mode: 'createdAt-sliding', slidingDays: 7 },
      );
      expect(result).toEqual(payload);
      expect(result).toBe(payload);
    });

    it('returns payload unchanged (identity) for field-range mode', () => {
      const payload = { name: 'test' };
      const result = DateWindowGuard.sanitizeWritePayload(
        payload,
        undefined,
        makeTable(),
        'update',
        makeRow(),
        { mode: 'field-range', validFromSlug: 'vf', validUntilSlug: 'vu' },
      );
      expect(result).toEqual(payload);
    });
  });

  // ── onTableBound — createdAt-* modes ─────────────────────────────────────

  describe('onTableBound — createdAt-sliding (no-op)', () => {
    it('returns right({ wasCreated: false }) without touching repos', async () => {
      const result = await DateWindowGuard.onTableBound(makeTable(), {
        mode: 'createdAt-sliding',
        slidingDays: 7,
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.wasCreated).toBe(false);
      }
      expect(mockDeps.fieldRepo.create).not.toHaveBeenCalled();
      expect(mockDeps.tableRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('onTableBound — createdAt-fixed (no-op)', () => {
    it('returns right({ wasCreated: false }) without touching repos', async () => {
      const result = await DateWindowGuard.onTableBound(makeTable(), {
        mode: 'createdAt-fixed',
        fixedFrom: '2025-01-01T00:00:00.000Z',
        fixedTo: null,
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.wasCreated).toBe(false);
      }
      expect(mockDeps.fieldRepo.create).not.toHaveBeenCalled();
    });
  });

  // ── onTableBound — field-range ─────────────────────────────────────────────

  describe('onTableBound — field-range', () => {
    const settings = {
      mode: 'field-range' as const,
      validFromSlug: 'valid_from',
      validUntilSlug: 'valid_until',
    };

    it('creates both fields when neither exists and returns wasCreated=true', async () => {
      const fromField = makeDateField('valid_from');
      const untilField = makeDateField('valid_until');

      vi.mocked(mockDeps.fieldRepo.create)
        .mockResolvedValueOnce(fromField)
        .mockResolvedValueOnce(untilField);
      vi.mocked(mockDeps.tableRepo.update).mockResolvedValue(makeTable());

      const table = makeTable([]);
      const result = await DateWindowGuard.onTableBound(table, settings);

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.wasCreated).toBe(true);
      }
      expect(mockDeps.fieldRepo.create).toHaveBeenCalledTimes(2);
      expect(mockDeps.tableRepo.update).toHaveBeenCalledOnce();
      expect(mockDeps.tableSchemaService.syncModel).toHaveBeenCalledOnce();
    });

    it('returns wasCreated=false when both fields already exist as DATE', async () => {
      const fromField = makeDateField('valid_from');
      const untilField = makeDateField('valid_until');
      const table = makeTable([fromField, untilField]);

      const result = await DateWindowGuard.onTableBound(table, settings);

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.wasCreated).toBe(false);
      }
      expect(mockDeps.fieldRepo.create).not.toHaveBeenCalled();
      expect(mockDeps.tableRepo.update).not.toHaveBeenCalled();
      expect(mockDeps.tableSchemaService.syncModel).not.toHaveBeenCalled();
    });

    it('returns left ROW_GUARD_FIELD_INCOMPATIBLE when validFrom slug taken by non-DATE field', async () => {
      const incompatibleField = {
        ...makeDateField('valid_from'),
        type: E_FIELD_TYPE.TEXT_SHORT,
      } as IField;
      const table = makeTable([incompatibleField]);

      const result = await DateWindowGuard.onTableBound(table, settings);

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.cause).toBe('ROW_GUARD_FIELD_INCOMPATIBLE');
      }
    });

    it('returns left ROW_GUARD_FIELD_INCOMPATIBLE when validUntil slug taken by non-DATE field', async () => {
      const fromField = makeDateField('valid_from');
      const incompatibleUntil = {
        ...makeDateField('valid_until'),
        type: E_FIELD_TYPE.DROPDOWN,
      } as IField;
      const table = makeTable([fromField, incompatibleUntil]);

      const result = await DateWindowGuard.onTableBound(table, settings);

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.cause).toBe('ROW_GUARD_FIELD_INCOMPATIBLE');
      }
    });

    it('creates only valid_until when valid_from already exists', async () => {
      const fromField = makeDateField('valid_from');
      const untilField = makeDateField('valid_until');
      const table = makeTable([fromField]); // valid_from already present

      vi.mocked(mockDeps.fieldRepo.create).mockResolvedValueOnce(untilField);
      vi.mocked(mockDeps.tableRepo.update).mockResolvedValue(makeTable());

      const result = await DateWindowGuard.onTableBound(table, settings);

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.wasCreated).toBe(true);
      }
      expect(mockDeps.fieldRepo.create).toHaveBeenCalledTimes(1);
      expect(mockDeps.tableRepo.update).toHaveBeenCalledOnce();
      expect(mockDeps.tableSchemaService.syncModel).toHaveBeenCalledOnce();
    });

    it('appends created field ids to all four fieldOrder arrays', async () => {
      const fromField = makeDateField('valid_from');
      const untilField = makeDateField('valid_until');

      vi.mocked(mockDeps.fieldRepo.create)
        .mockResolvedValueOnce(fromField)
        .mockResolvedValueOnce(untilField);
      vi.mocked(mockDeps.tableRepo.update).mockResolvedValue(makeTable());

      const table = {
        ...makeTable([]),
        fieldOrderList: ['existing-field-id'],
        fieldOrderForm: ['existing-field-id'],
        fieldOrderFilter: [],
        fieldOrderDetail: [],
      } as unknown as ITable;

      await DateWindowGuard.onTableBound(table, settings);

      const updateCall = vi.mocked(mockDeps.tableRepo.update).mock.calls[0][0];
      expect(updateCall.fieldOrderList).toContain('existing-field-id');
      expect(updateCall.fieldOrderList).toContain(fromField._id);
      expect(updateCall.fieldOrderList).toContain(untilField._id);
      expect(updateCall.fieldOrderForm).toContain(fromField._id);
      expect(updateCall.fieldOrderFilter).toContain(fromField._id);
      expect(updateCall.fieldOrderDetail).toContain(fromField._id);
    });
  });
});
