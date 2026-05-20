/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import {
  buildOrder,
  buildPopulate,
  buildQuery,
  buildTable,
} from '@application/core/builders';
import type { IRow } from '@application/core/entity.core';
import { getDataConnection } from '@config/database.config';

interface SubdocArray<T = unknown> extends Array<T> {
  id(
    itemId: string,
  ): (T & { set(d: Record<string, unknown>): void; deleteOne(): void }) | null;
}

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSubdocArray(value: unknown): value is SubdocArray {
  if (!Array.isArray(value)) return false;
  return 'id' in value && typeof value.id === 'function';
}

interface MongooseDocWithToJSON {
  toJSON(opts: { flattenObjectIds: boolean }): Record<string, unknown>;
  _id: { toString(): string };
}

function hasToJSON(value: unknown): value is MongooseDocWithToJSON {
  return isRecord(value) && typeof value['toJSON'] === 'function';
}

function assertIRow(value: Record<string, unknown>): asserts value is IRow {
  if (typeof value['_id'] !== 'string') {
    throw new Error('Invalid row: _id must be string');
  }
}

@Service()
export default class RowMongooseRepository extends RowContractRepository {
  private async getModel(
    table: RowTableContext,
  ): ReturnType<typeof buildTable> {
    return buildTable(table, getDataConnection());
  }

  private async getPopulate(
    table: RowTableContext,
    includeReverse: boolean,
  ): ReturnType<typeof buildPopulate> {
    const conn = getDataConnection();
    if (includeReverse) {
      return buildPopulate(table.fields, table.groups, table.slug, conn);
    }
    return buildPopulate(table.fields, table.groups, undefined, conn);
  }

  private transformRow(doc: unknown): IRow {
    let json: Record<string, unknown>;

    if (hasToJSON(doc)) {
      json = doc.toJSON({ flattenObjectIds: true });
    } else if (isRecord(doc)) {
      json = { ...doc };
    } else {
      json = {};
    }

    let id = '';
    if (isRecord(doc) && doc['_id']) {
      id = String(doc['_id']);
    }

    json['_id'] = id;
    assertIRow(json);
    return json;
  }

  // ── Core CRUD ─────────────────────────────────────────────

  async create(payload: RowCreatePayload): Promise<IRow> {
    const model = await this.getModel(payload.table);
    const populate = await this.getPopulate(payload.table, false);

    const created = await model.create(payload.data);
    const populated = await created.populate(populate);

    return this.transformRow(populated);
  }

  async findOne(payload: RowFindOnePayload): Promise<IRow | null> {
    const model = await this.getModel(payload.table);
    const row = await model.findOne(payload.query);

    if (!row) return null;

    const shouldPopulate = payload.populate !== false;
    if (shouldPopulate) {
      const populate = await this.getPopulate(
        payload.table,
        payload.includeReverseRelationships || false,
      );
      await row.populate(populate);
    }

    return this.transformRow(row);
  }

  async findMany(payload: RowFindManyPayload): Promise<IRow[]> {
    const model = await this.getModel(payload.table);
    const populate = await this.getPopulate(
      payload.table,
      payload.includeReverseRelationships || false,
    );

    const conn = getDataConnection();
    const query = await buildQuery(
      payload.rawFilters ?? {},
      payload.table.fields ?? [],
      payload.table.groups,
      payload.table.slug,
      conn,
    );

    const sort = buildOrder(
      payload.rawFilters ?? {},
      payload.table.fields ?? [],
      payload.table.order,
    );

    const rows = await model
      .find(query)
      .populate(populate)
      .skip(payload.skip)
      .limit(payload.limit)
      .sort(sort);

    return rows.map((row) => this.transformRow(row));
  }

  async count(
    table: RowTableContext,
    rawFilters?: Record<string, unknown>,
  ): Promise<number> {
    const model = await this.getModel(table);
    const query = await buildQuery(
      rawFilters ?? {},
      table.fields ?? [],
      table.groups,
      table.slug,
      getDataConnection(),
    );
    return model.countDocuments(query);
  }

  async update(payload: RowUpdatePayload): Promise<IRow | null> {
    const model = await this.getModel(payload.table);
    const populate = await this.getPopulate(payload.table, false);

    const row = await model.findOne({ _id: payload._id }).populate(populate);

    if (!row) return null;

    await row
      .set({
        ...row.toJSON({ flattenObjectIds: true }),
        ...payload.data,
      })
      .save();

    await row.populate(populate);

    return this.transformRow(row);
  }

  async deleteOne(table: RowTableContext, _id: string): Promise<boolean> {
    const model = await this.getModel(table);
    const result = await model.findOneAndDelete({ _id });
    return result !== null;
  }

  // ── Trash (bulk) ──────────────────────────────────────────

  async bulkTrash(payload: RowBulkUpdatePayload): Promise<number> {
    const model = await this.getModel(payload.table);
    const result = await model.updateMany(
      { _id: { $in: payload.ids }, trashed: false },
      { $set: { trashed: true, trashedAt: new Date() } },
    );
    return result.modifiedCount;
  }

  async bulkRestore(payload: RowBulkUpdatePayload): Promise<number> {
    const model = await this.getModel(payload.table);
    const result = await model.updateMany(
      { _id: { $in: payload.ids }, trashed: true },
      { $set: { trashed: false, trashedAt: null } },
    );
    return result.modifiedCount;
  }

  async bulkDelete(payload: RowBulkDeletePayload): Promise<number> {
    const model = await this.getModel(payload.table);
    const result = await model.deleteMany({
      _id: { $in: payload.ids },
      trashed: true,
    });
    return result.deletedCount;
  }

  async emptyTrash(table: RowTableContext): Promise<number> {
    const model = await this.getModel(table);
    const result = await model.deleteMany({ trashed: true });
    return result.deletedCount;
  }

  // ── Field-level (reaction / evaluation) ───────────────────

  async setFieldAndSave(payload: RowSetFieldPayload): Promise<IRow> {
    const model = await this.getModel(payload.table);
    const populate = await this.getPopulate(payload.table, false);

    const row = await model.findOne({ _id: payload._id });
    if (!row) throw new Error('Row not found');

    await row.set(payload.field, payload.value).save();
    await row.populate(populate);

    return this.transformRow(row);
  }

  // ── Group rows (subdocumentos) ────────────────────────────

  async addGroupItem(
    payload: RowGroupItemPayload & { data: Record<string, unknown> },
  ): Promise<IRow> {
    const model = await this.getModel(payload.table);
    const populate = await this.getPopulate(payload.table, false);

    const row = await model.findOne({ _id: payload.rowId });
    if (!row) throw new Error('Row not found');

    const currentItems = row.get(payload.groupFieldSlug);
    const groupData = Array.isArray(currentItems) ? [...currentItems] : [];
    groupData.push(payload.data);

    row.set(payload.groupFieldSlug, groupData);
    await row.save();
    await row.populate(populate);

    return this.transformRow(row);
  }

  async updateGroupItem(
    payload: RowGroupItemPayload & {
      itemId: string;
      data: Record<string, unknown>;
    },
  ): Promise<IRow> {
    const model = await this.getModel(payload.table);
    const populate = await this.getPopulate(payload.table, false);

    const row = await model.findOne({ _id: payload.rowId });
    if (!row) throw new Error('Row not found');

    const subdocArray = row.get(payload.groupFieldSlug);

    if (!isSubdocArray(subdocArray)) {
      throw new Error('Group field not found');
    }

    const subdoc = subdocArray.id(payload.itemId);
    if (!subdoc) throw new Error('Item not found');

    subdoc.set(payload.data);
    await row.save();
    await row.populate(populate);

    return this.transformRow(row);
  }

  async deleteGroupItem(
    payload: RowGroupItemPayload & { itemId: string },
  ): Promise<boolean> {
    const model = await this.getModel(payload.table);

    const row = await model.findOne({ _id: payload.rowId });
    if (!row) return false;

    const subdocArray = row.get(payload.groupFieldSlug);
    if (!isSubdocArray(subdocArray)) return false;

    const subdoc = subdocArray.id(payload.itemId);
    if (!subdoc) return false;

    subdoc.deleteOne();
    await row.save();

    return true;
  }

  // ── Atomic update (forum-message) ─────────────────────────

  async findOneAndUpdate(
    table: RowTableContext,
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
  ): Promise<IRow | null> {
    const model = await this.getModel(table);
    const populate = await this.getPopulate(table, false);

    const row = await model.findOneAndUpdate(filter, update, { new: true });
    if (!row) return null;

    await row.populate(populate);

    return this.transformRow(row);
  }

  // ── Infrastructure-level ops (table/import/export tools) ──

  async renameField(
    table: RowTableContext,
    oldSlug: string,
    newSlug: string,
  ): Promise<void> {
    const model = await this.getModel(table);
    await model.updateMany({}, { $rename: { [oldSlug]: newSlug } });
  }

  async findAllRaw(table: RowTableContext): Promise<Record<string, unknown>[]> {
    const model = await this.getModel(table);
    const docs = await model.find({ trashed: { $ne: true } }).lean();
    return docs.map((doc): Record<string, unknown> => ({ ...doc }));
  }

  async bulkSetMissingField(
    table: RowTableContext,
    fieldSlug: string,
    defaultValue: unknown,
  ): Promise<{ matched: number; modified: number }> {
    const model = await this.getModel(table);
    const result = await model.updateMany(
      { [`data.${fieldSlug}`]: { $exists: false } },
      { $set: { [`data.${fieldSlug}`]: defaultValue } },
    );
    return { matched: result.matchedCount, modified: result.modifiedCount };
  }

  async insertRaw(
    table: RowTableContext,
    row: Record<string, unknown>,
    creator?: string,
  ): Promise<IRow> {
    const model = await this.getModel(table);
    const { _id, id, createdAt, updatedAt, ...data } = row;
    const doc = new model(data);
    if (creator) {
      (doc as any).creator = creator;
    }
    const result = await doc.collection.insertOne((doc as any).toObject());
    return {
      ...(doc as any).toObject(),
      _id: result.insertedId.toString(),
    } as IRow;
  }
}
