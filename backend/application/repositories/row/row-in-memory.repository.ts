import { randomUUID } from 'node:crypto';

import type { IRow } from '@application/core/entity.core';

import type {
  RowBulkDeletePayload,
  RowBulkUpdatePayload,
  RowCreatePayload,
  RowFindManyPayload,
  RowFindOnePayload,
  RowGroupItemPayload,
  RowSetFieldPayload,
  RowTableContext,
  RowUpdatePayload,
} from './row-contract.repository';
import { RowContractRepository } from './row-contract.repository';

export default class RowInMemoryRepository extends RowContractRepository {
  private collections = new Map<string, IRow[]>();
  private _forcedErrors = new Map<string, Error>();

  simulateError(method: string, error: Error): void {
    this._forcedErrors.set(method, error);
  }

  private _checkError(method: string): void {
    const err = this._forcedErrors.get(method);
    if (err) {
      this._forcedErrors.delete(method);
      throw err;
    }
  }

  private getCollection(slug: string): IRow[] {
    if (!this.collections.has(slug)) {
      this.collections.set(slug, []);
    }
    return this.collections.get(slug)!;
  }

  reset(): void {
    this.collections.clear();
  }

  // ── Core CRUD ─────────────────────────────────────────────

  async create(payload: RowCreatePayload): Promise<IRow> {
    const collection = this.getCollection(payload.table.slug);

    const row: IRow = {
      _id: randomUUID(),
      ...payload.data,
      trashed: false,
      trashedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as IRow;

    collection.push(row);
    return { ...row };
  }

  async findOne(payload: RowFindOnePayload): Promise<IRow | null> {
    const collection = this.getCollection(payload.table.slug);

    const row = collection.find((item) => {
      for (const [key, value] of Object.entries(payload.query)) {
        if ((item as Record<string, unknown>)[key] !== value) return false;
      }
      return true;
    });

    if (!row) return null;
    return { ...row };
  }

  async findMany(payload: RowFindManyPayload): Promise<IRow[]> {
    const collection = this.getCollection(payload.table.slug);

    const rawFilters = payload.rawFilters ?? {};
    const result = collection.filter((item) => {
      const row = item as Record<string, unknown>;
      if (row['trashed'] === true) return false;
      for (const [key, value] of Object.entries(rawFilters)) {
        if (
          key === 'page' ||
          key === 'perPage' ||
          key === 'slug' ||
          key === 'public' ||
          key === 'search' ||
          key === 'trashed' ||
          key === 'user' ||
          key === 'userJwt' ||
          String(key).startsWith('order-')
        ) {
          continue;
        }
        if (row[key] !== value) return false;
      }
      return true;
    });

    return result
      .slice(payload.skip, payload.skip + payload.limit)
      .map((r) => ({ ...r }));
  }

  async count(
    table: RowTableContext,
    rawFilters?: Record<string, unknown>,
  ): Promise<number> {
    const collection = this.getCollection(table.slug);
    const filters = rawFilters ?? {};

    return collection.filter((item) => {
      const row = item as Record<string, unknown>;
      if (row['trashed'] === true) return false;
      for (const [key, value] of Object.entries(filters)) {
        if (
          key === 'page' ||
          key === 'perPage' ||
          key === 'slug' ||
          key === 'public' ||
          key === 'search' ||
          key === 'trashed' ||
          key === 'user' ||
          key === 'userJwt' ||
          String(key).startsWith('order-')
        ) {
          continue;
        }
        if (row[key] !== value) return false;
      }
      return true;
    }).length;
  }

  async update(payload: RowUpdatePayload): Promise<IRow | null> {
    const collection = this.getCollection(payload.table.slug);
    const index = collection.findIndex((item) => item._id === payload._id);

    if (index === -1) return null;

    collection[index] = {
      ...collection[index],
      ...payload.data,
      updatedAt: new Date(),
    } as IRow;

    return { ...collection[index] };
  }

  async deleteOne(table: RowTableContext, _id: string): Promise<boolean> {
    const collection = this.getCollection(table.slug);
    const index = collection.findIndex((item) => item._id === _id);

    if (index === -1) return false;

    collection.splice(index, 1);
    return true;
  }

  // ── Trash (bulk) ──────────────────────────────────────────

  async bulkTrash(payload: RowBulkUpdatePayload): Promise<number> {
    const collection = this.getCollection(payload.table.slug);
    let count = 0;

    for (const row of collection) {
      if (payload.ids.includes(row._id) && !row.trashed) {
        row.trashed = true;
        row.trashedAt = new Date();
        count++;
      }
    }

    return count;
  }

  async bulkRestore(payload: RowBulkUpdatePayload): Promise<number> {
    const collection = this.getCollection(payload.table.slug);
    let count = 0;

    for (const row of collection) {
      if (payload.ids.includes(row._id) && row.trashed) {
        row.trashed = false;
        row.trashedAt = null;
        count++;
      }
    }

    return count;
  }

  async bulkDelete(payload: RowBulkDeletePayload): Promise<number> {
    const collection = this.getCollection(payload.table.slug);
    let count = 0;
    const remaining: IRow[] = [];

    for (const row of collection) {
      if (payload.ids.includes(row._id) && row.trashed) {
        count++;
      } else {
        remaining.push(row);
      }
    }

    this.collections.set(payload.table.slug, remaining);
    return count;
  }

  async emptyTrash(table: RowTableContext): Promise<number> {
    const collection = this.getCollection(table.slug);
    const remaining = collection.filter((item) => !item.trashed);
    const count = collection.length - remaining.length;

    this.collections.set(table.slug, remaining);
    return count;
  }

  // ── Field-level (reaction / evaluation) ───────────────────

  async setFieldAndSave(payload: RowSetFieldPayload): Promise<IRow> {
    const collection = this.getCollection(payload.table.slug);
    const row = collection.find((item) => item._id === payload._id);

    if (!row) throw new Error('Row not found');

    (row as Record<string, unknown>)[payload.field] = payload.value;
    row.updatedAt = new Date();

    return { ...row };
  }

  // ── Group rows (subdocumentos) ────────────────────────────

  async addGroupItem(
    payload: RowGroupItemPayload & { data: Record<string, unknown> },
  ): Promise<IRow> {
    const collection = this.getCollection(payload.table.slug);
    const row = collection.find((item) => item._id === payload.rowId);

    if (!row) throw new Error('Row not found');

    const currentItems = (row as Record<string, unknown>)[
      payload.groupFieldSlug
    ];
    const groupData: Record<string, unknown>[] = Array.isArray(currentItems)
      ? [...currentItems]
      : [];

    groupData.push({ _id: randomUUID(), ...payload.data });
    (row as Record<string, unknown>)[payload.groupFieldSlug] = groupData;
    row.updatedAt = new Date();

    return JSON.parse(JSON.stringify(row)) as IRow;
  }

  async updateGroupItem(
    payload: RowGroupItemPayload & {
      itemId: string;
      data: Record<string, unknown>;
    },
  ): Promise<IRow> {
    const collection = this.getCollection(payload.table.slug);
    const row = collection.find((item) => item._id === payload.rowId);

    if (!row) throw new Error('Row not found');

    const items = (row as Record<string, unknown>)[payload.groupFieldSlug];
    if (!Array.isArray(items)) throw new Error('Group field not found');

    const item = items.find(
      (i: Record<string, unknown>) => String(i._id) === payload.itemId,
    );
    if (!item) throw new Error('Item not found');

    Object.assign(item, payload.data);
    row.updatedAt = new Date();

    return { ...row };
  }

  async deleteGroupItem(
    payload: RowGroupItemPayload & { itemId: string },
  ): Promise<boolean> {
    const collection = this.getCollection(payload.table.slug);
    const row = collection.find((item) => item._id === payload.rowId);

    if (!row) return false;

    const items = (row as Record<string, unknown>)[payload.groupFieldSlug];
    if (!Array.isArray(items)) return false;

    const index = items.findIndex(
      (i: Record<string, unknown>) => String(i._id) === payload.itemId,
    );
    if (index === -1) return false;

    items.splice(index, 1);
    row.updatedAt = new Date();

    return true;
  }

  // ── Atomic update (forum-message) ─────────────────────────

  async findOneAndUpdate(
    table: RowTableContext,
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
  ): Promise<IRow | null> {
    const collection = this.getCollection(table.slug);

    const row = collection.find((item) => {
      for (const [key, value] of Object.entries(filter)) {
        if ((item as Record<string, unknown>)[key] !== value) return false;
      }
      return true;
    });

    if (!row) return null;

    const setData = (update as { $set?: Record<string, unknown> }).$set;
    if (setData) {
      for (const [key, value] of Object.entries(setData)) {
        (row as Record<string, unknown>)[key] = value;
      }
    }

    row.updatedAt = new Date();
    return { ...row };
  }

  // ── Infrastructure-level ops (table/import/export tools) ──

  async renameField(
    table: RowTableContext,
    oldSlug: string,
    newSlug: string,
  ): Promise<void> {
    const collection = this.getCollection(table.slug);
    for (const row of collection) {
      const record = row as Record<string, unknown>;
      if (Object.prototype.hasOwnProperty.call(record, oldSlug)) {
        record[newSlug] = record[oldSlug];
        delete record[oldSlug];
      }
    }
  }

  async findAllRaw(table: RowTableContext): Promise<Record<string, unknown>[]> {
    const collection = this.getCollection(table.slug);
    return collection
      .filter((row) => !row.trashed)
      .map((row) => ({ ...row })) as Record<string, unknown>[];
  }

  async bulkSetMissingField(
    table: RowTableContext,
    fieldSlug: string,
    defaultValue: unknown,
  ): Promise<{ matched: number; modified: number }> {
    const collection = this.getCollection(table.slug);
    let matched = 0;
    let modified = 0;

    for (const row of collection) {
      if (row.trashed) continue;
      const record = row as Record<string, unknown>;
      matched++;
      if (!Object.prototype.hasOwnProperty.call(record, fieldSlug)) {
        record[fieldSlug] = defaultValue;
        modified++;
      }
    }

    return { matched, modified };
  }

  async insertRaw(
    table: RowTableContext,
    row: Record<string, unknown>,
    creator?: string,
  ): Promise<IRow> {
    const collection = this.getCollection(table.slug);
    const data: Record<string, unknown> = { ...row };
    delete data._id;
    delete data.id;
    delete data.createdAt;
    delete data.updatedAt;
    const newRow: IRow = {
      _id: randomUUID(),
      ...data,
      creator: creator ?? null,
      trashed: false,
      trashedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as IRow;
    collection.push(newRow);
    return { ...newRow };
  }
}
