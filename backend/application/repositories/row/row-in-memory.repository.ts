import { randomUUID } from 'node:crypto';

import type { IRow, Merge } from '@application/core/entity.core';
import { resolveCreatorId } from '@application/core/row-ownership.core';

import type {
  RowBulkDeletePayload,
  RowBulkUpdatePayload,
  RowCreatePayload,
  RowFindManyPayload,
  RowFindOnePayload,
  RowGroupItemPayload,
  RowSetFieldPayload,
  RowTableContext,
  RowUpdateManyPayload,
  RowUpdatePayload,
} from './row-contract.repository';
import { RowContractRepository } from './row-contract.repository';

/**
 * Aplica um fragmento de guardQuery sobre um item da colecao in-memory.
 * Suporta operadores basicos usados pelo RowAccessGuard: $in, $and, $or.
 * Para testes: nao precisa cobrir todo o MongoDB query DSL.
 */
function matchesGuardQuery(
  row: Record<string, unknown>,
  query: Record<string, unknown>,
): boolean {
  if (!query || Object.keys(query).length === 0) return true;

  for (const [key, condition] of Object.entries(query)) {
    if (key === '$and') {
      if (!Array.isArray(condition)) continue;
      if (!condition.every((part) => matchesGuardQuery(row, part)))
        return false;
      continue;
    }
    if (key === '$or') {
      if (!Array.isArray(condition)) continue;
      if (!condition.some((part) => matchesGuardQuery(row, part))) return false;
      continue;
    }

    const fieldVal = row[key];
    if (
      condition !== null &&
      typeof condition === 'object' &&
      !Array.isArray(condition)
    ) {
      if ('$in' in condition) {
        const allowed = condition['$in'];
        let rowValue = fieldVal;
        if (Array.isArray(fieldVal)) rowValue = fieldVal[0];
        if (Array.isArray(allowed) && !allowed.includes(rowValue)) return false;
      }
    } else {
      if (fieldVal !== condition) return false;
    }
  }

  return true;
}

export default class RowInMemoryRepository implements RowContractRepository {
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
      status: 'published',
      draftAt: null,
      trashedAt: null,
      ...payload.data,
      _id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    collection.push(row);
    return { ...row };
  }

  async findOne(payload: RowFindOnePayload): Promise<IRow | null> {
    const collection = this.getCollection(payload.table.slug);

    const row = collection.find((item) => {
      for (const [key, value] of Object.entries(payload.query)) {
        if (item[key] !== value) return false;
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
      const row = item;
      if (row['trashedAt'] != null) return false;
      for (const [key, value] of Object.entries(rawFilters)) {
        if (
          key === 'page' ||
          key === 'perPage' ||
          key === 'slug' ||
          key === 'public' ||
          key === 'search' ||
          key === 'trashed' ||
          key === 'excludeLinked' ||
          key === 'relationshipId' ||
          key === 'excludeSide' ||
          key === 'excludeForRecordId' ||
          key === 'excludeSelfId' ||
          String(key).startsWith('order-')
        ) {
          continue;
        }
        if (row[key] !== value) return false;
      }
      // Aplica o fragmento de guardQuery (row-access-guard)
      if (payload.guardQuery && Object.keys(payload.guardQuery).length > 0) {
        if (!matchesGuardQuery(row, payload.guardQuery)) return false;
      }
      return true;
    });

    let filtered = result;
    if (payload.excludeIds && payload.excludeIds.length > 0) {
      const excludeSet = new Set(payload.excludeIds);
      filtered = result.filter((row) => !excludeSet.has(String(row._id)));
    }

    // limit <= 0 significa "sem limite" (busca todos), espelhando o
    // comportamento do Mongoose .limit(0).
    let sliced: IRow[];
    if (payload.limit <= 0) {
      sliced = filtered.slice(payload.skip);
    } else {
      sliced = filtered.slice(payload.skip, payload.skip + payload.limit);
    }

    return sliced.map((r) => ({ ...r }));
  }

  async count(
    table: RowTableContext,
    rawFilters?: Record<string, unknown>,
    guardQuery?: Record<string, unknown>,
    excludeIds?: string[],
  ): Promise<number> {
    const collection = this.getCollection(table.slug);
    const filters = rawFilters ?? {};
    let excludeSet: Set<string> | null = null;
    if (excludeIds && excludeIds.length > 0) excludeSet = new Set(excludeIds);

    return collection.filter((item) => {
      const row = item;
      if (row['trashedAt'] != null) return false;
      if (excludeSet && excludeSet.has(String(row['_id']))) return false;
      for (const [key, value] of Object.entries(filters)) {
        if (
          key === 'page' ||
          key === 'perPage' ||
          key === 'slug' ||
          key === 'public' ||
          key === 'search' ||
          key === 'trashed' ||
          key === 'excludeLinked' ||
          key === 'relationshipId' ||
          key === 'excludeSide' ||
          key === 'excludeForRecordId' ||
          key === 'excludeSelfId' ||
          String(key).startsWith('order-')
        ) {
          continue;
        }
        if (row[key] !== value) return false;
      }
      if (guardQuery && Object.keys(guardQuery).length > 0) {
        if (!matchesGuardQuery(row, guardQuery)) return false;
      }
      return true;
    }).length;
  }

  async countFieldValue(
    table: RowTableContext,
    fieldSlug: string,
    value: unknown,
    excludeRowId: string | null = null,
  ): Promise<number> {
    const collection = this.getCollection(table.slug);

    return collection.filter((row) => {
      if (row.trashedAt != null) return false;
      if (excludeRowId && row._id === excludeRowId) return false;
      const current = row[fieldSlug];
      // Campo multiplo (array): match se contiver o valor (semantica mongo).
      if (Array.isArray(current)) return current.includes(value);
      return current === value;
    }).length;
  }

  async update(payload: RowUpdatePayload): Promise<IRow | null> {
    const collection = this.getCollection(payload.table.slug);
    const index = collection.findIndex((item) => item._id === payload._id);

    if (index === -1) return null;

    collection[index] = {
      ...collection[index],
      ...payload.data,
      _id: collection[index]._id,
      updatedAt: new Date(),
    };

    return { ...collection[index] };
  }

  async deleteOne(table: RowTableContext, _id: string): Promise<boolean> {
    const collection = this.getCollection(table.slug);
    const index = collection.findIndex((item) => item._id === _id);

    if (index === -1) return false;

    collection.splice(index, 1);
    return true;
  }

  async listSlugs(
    table: RowTableContext,
    excludeId?: string,
  ): Promise<string[]> {
    const collection = this.getCollection(table.slug);

    const slugs: string[] = [];
    for (const item of collection) {
      if (excludeId && item._id === excludeId) continue;
      const value = item.sharedRowSlug;
      if (typeof value === 'string' && value.length > 0) slugs.push(value);
    }

    return slugs;
  }

  // ── Trash (bulk) ──────────────────────────────────────────

  async bulkTrash(payload: RowBulkUpdatePayload): Promise<number> {
    const collection = this.getCollection(payload.table.slug);
    let count = 0;

    for (const row of collection) {
      if (
        payload.creatorId &&
        resolveCreatorId(row.creator) !== payload.creatorId
      )
        continue;
      if (payload.ids.includes(row._id) && row.trashedAt == null) {
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
      if (
        payload.creatorId &&
        resolveCreatorId(row.creator) !== payload.creatorId
      )
        continue;
      if (payload.ids.includes(row._id) && row.trashedAt != null) {
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
      const ownedByOther =
        !!payload.creatorId &&
        resolveCreatorId(row.creator) !== payload.creatorId;
      if (
        !ownedByOther &&
        payload.ids.includes(row._id) &&
        row.trashedAt != null
      ) {
        count++;
      } else {
        remaining.push(row);
      }
    }

    this.collections.set(payload.table.slug, remaining);
    return count;
  }

  async emptyTrash(
    table: RowTableContext,
    creatorId?: string,
  ): Promise<number> {
    const collection = this.getCollection(table.slug);
    const remaining = collection.filter((item) => {
      if (item.trashedAt == null) return true;
      if (creatorId && resolveCreatorId(item.creator) !== creatorId)
        return true;
      return false;
    });
    const count = collection.length - remaining.length;

    this.collections.set(table.slug, remaining);
    return count;
  }

  // ── Field-level (reaction / evaluation) ───────────────────

  async setFieldAndSave(payload: RowSetFieldPayload): Promise<IRow> {
    const collection = this.getCollection(payload.table.slug);
    const row = collection.find((item) => item._id === payload._id);

    if (!row) throw new Error('Row not found');

    row[payload.field] = payload.value;
    row.updatedAt = new Date();

    return { ...row };
  }

  // ── Group rows (subdocumentos) ────────────────────────────

  async addGroupItem(
    payload: Merge<RowGroupItemPayload, { data: Record<string, unknown> }>,
  ): Promise<IRow> {
    const collection = this.getCollection(payload.table.slug);
    const row = collection.find((item) => item._id === payload.rowId);

    if (!row) throw new Error('Row not found');

    const currentItems = row[payload.groupFieldSlug];
    let groupData: Record<string, unknown>[] = [];
    if (Array.isArray(currentItems)) groupData = [...currentItems];

    groupData.push({ _id: randomUUID(), ...payload.data });
    row[payload.groupFieldSlug] = groupData;
    row.updatedAt = new Date();

    return JSON.parse(JSON.stringify(row));
  }

  async updateGroupItem(
    payload: Merge<
      RowGroupItemPayload,
      {
        itemId: string;
        data: Record<string, unknown>;
      }
    >,
  ): Promise<IRow> {
    const collection = this.getCollection(payload.table.slug);
    const row = collection.find((item) => item._id === payload.rowId);

    if (!row) throw new Error('Row not found');

    const items = row[payload.groupFieldSlug];
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
    payload: Merge<RowGroupItemPayload, { itemId: string }>,
  ): Promise<boolean> {
    const collection = this.getCollection(payload.table.slug);
    const row = collection.find((item) => item._id === payload.rowId);

    if (!row) return false;

    const items = row[payload.groupFieldSlug];
    if (!Array.isArray(items)) return false;

    const index = items.findIndex(
      (i: Record<string, unknown>) => String(i._id) === payload.itemId,
    );
    if (index === -1) return false;

    items.splice(index, 1);
    row.updatedAt = new Date();

    return true;
  }

  // ── Atomic update (forum-message / backfill) ──────────────

  async findOneAndUpdate(
    table: RowTableContext,
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
  ): Promise<IRow | null> {
    const collection = this.getCollection(table.slug);

    const row = collection.find((item) => {
      for (const [key, value] of Object.entries(filter)) {
        if (item[key] !== value) return false;
      }
      return true;
    });

    if (!row) return null;

    const setData = update['$set'];
    if (setData && typeof setData === 'object') {
      for (const [key, value] of Object.entries(setData)) {
        row[key] = value;
      }
    }

    row.updatedAt = new Date();
    return { ...row };
  }

  async updateMany(payload: RowUpdateManyPayload): Promise<number> {
    const collection = this.getCollection(payload.table.slug);
    let count = 0;

    for (const row of collection) {
      const record = row;
      let matches = true;
      for (const [key, condition] of Object.entries(payload.filter)) {
        if (
          condition !== null &&
          typeof condition === 'object' &&
          !Array.isArray(condition)
        ) {
          if ('$exists' in condition) {
            const shouldExist = Boolean(condition['$exists']);
            const fieldExists = key in record && record[key] !== undefined;
            if (shouldExist !== fieldExists) {
              matches = false;
              break;
            }
          }
        } else {
          if (record[key] !== condition) {
            matches = false;
            break;
          }
        }
      }

      if (!matches) continue;

      const setData = payload.update['$set'];
      if (setData && typeof setData === 'object') {
        for (const [key, value] of Object.entries(setData)) {
          record[key] = value;
        }
      }

      row.updatedAt = new Date();
      count++;
    }

    return count;
  }

  // ── Infrastructure-level ops (table/import/export tools) ──

  async renameField(
    table: RowTableContext,
    oldSlug: string,
    newSlug: string,
  ): Promise<void> {
    const collection = this.getCollection(table.slug);
    for (const row of collection) {
      const record = row;
      if (Object.prototype.hasOwnProperty.call(record, oldSlug)) {
        record[newSlug] = record[oldSlug];
        delete record[oldSlug];
      }
    }
  }

  async findAllRaw(table: RowTableContext): Promise<Record<string, unknown>[]> {
    const collection = this.getCollection(table.slug);
    return collection
      .filter((row) => row.trashedAt == null)
      .map((row) => ({ ...row }));
  }

  // ── Resolver helpers (csv-import) ─────────────────────────

  async findManyByFieldValues(
    table: RowTableContext,
    fieldSlugs: string[],
    values: string[],
  ): Promise<IRow[]> {
    if (fieldSlugs.length === 0 || values.length === 0) return [];

    const collection = this.getCollection(table.slug);
    const valueSet = new Set(values);

    return collection
      .filter((row) => {
        if (row.trashedAt != null) return false;
        for (const slug of fieldSlugs) {
          const fieldValue = row[slug];
          if (typeof fieldValue === 'string' && valueSet.has(fieldValue)) {
            return true;
          }
        }
        return false;
      })
      .map((row) => ({ ...row }));
  }

  // ── Category cleanup (delete-category) ────────────────────

  async pullCategoryValues(
    table: RowTableContext,
    fieldSlug: string,
    ids: string[],
  ): Promise<number> {
    if (ids.length === 0) return 0;

    const collection = this.getCollection(table.slug);
    const idSet = new Set(ids);
    let count = 0;

    for (const row of collection) {
      const record = row;
      const value = record[fieldSlug];
      if (!Array.isArray(value)) continue;

      const filtered = value.filter((item) => !idSet.has(String(item)));
      if (filtered.length !== value.length) {
        record[fieldSlug] = filtered;
        row.updatedAt = new Date();
        count++;
      }
    }

    return count;
  }

  async clearFieldValue(
    table: RowTableContext,
    fieldSlug: string,
    value: string,
  ): Promise<number> {
    const collection = this.getCollection(table.slug);
    let count = 0;

    for (const row of collection) {
      if (Reflect.get(row, fieldSlug) !== value) continue;
      Reflect.set(row, fieldSlug, null);
      row.updatedAt = new Date();
      count++;
    }

    return count;
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
      ...data,
      _id: randomUUID(),
      creator: creator ?? null,
      status: 'published',
      draftAt: null,
      trashedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    collection.push(newRow);
    return { ...newRow };
  }
}
