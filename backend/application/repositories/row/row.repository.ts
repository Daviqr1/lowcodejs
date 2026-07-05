/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';
import mongoose from 'mongoose';

import type { IField, IRow, Merge } from '@application/core/entity.core';
import { ModelBuilderContractService } from '@application/services/table/model-builder-contract.service';
import { PopulateBuilderContractService } from '@application/services/table/populate-builder-contract.service';
import { QueryBuilderContractService } from '@application/services/table/query-builder-contract.service';
import { RelationshipBuilderContractService } from '@application/services/table/relationship-builder-contract.service';
import type { RelationshipHydratableDoc } from '@application/services/table/relationship-builder-contract.service';
import { getDataConnection } from '@config/database.config';

// Interseção com Array<T>: mantém `&` (Merge mapearia as chaves e destruiria a
// semântica de array). Exceção documentada no skill code-style.
type SubdocArray<T = unknown> = Array<T> & {
  id(
    itemId: string,
  ): (T & { set(d: Record<string, unknown>): void; deleteOne(): void }) | null;
};

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSubdocArray(value: unknown): value is SubdocArray {
  if (!Array.isArray(value)) return false;
  // Mongoose 8 envolve document arrays em Proxy: `'id' in value` retorna false
  // mesmo com o metodo presente. Reflect.get dispara o get trap do Proxy.
  return typeof Reflect.get(value, 'id') === 'function';
}

type MongooseDocWithToJSON = {
  toJSON(opts: { flattenObjectIds: boolean }): Record<string, unknown>;
  _id: { toString(): string };
};

function hasToJSON(value: unknown): value is MongooseDocWithToJSON {
  return isRecord(value) && typeof value['toJSON'] === 'function';
}

function assertIRow(value: Record<string, unknown>): asserts value is IRow {
  if (typeof value['_id'] !== 'string') {
    throw new Error('Invalid row: _id must be string');
  }
}

@Service()
export default class RowMongooseRepository implements RowContractRepository {
  constructor(
    private readonly model: ModelBuilderContractService,
    private readonly query: QueryBuilderContractService,
    private readonly populate: PopulateBuilderContractService,
    private readonly relationship: RelationshipBuilderContractService,
  ) {}

  // Hidrata os paths RELATIONSHIP geridos por links nos docs antes do populate,
  // para que o populate padrao resolva como no modelo embedded legado.
  private async hydrateRelationships(
    fields: IField[],
    docs: RelationshipHydratableDoc[],
  ): Promise<void> {
    await this.relationship.hydrate(fields, docs);
  }

  private async getModel(
    table: RowTableContext,
  ): ReturnType<ModelBuilderContractService['build']> {
    return this.model.build(table);
  }

  private async getPopulate(
    table: RowTableContext,
  ): ReturnType<PopulateBuilderContractService['build']> {
    const rootId = table._id?.toString();
    let ancestors: Set<string> | undefined;
    if (rootId) ancestors = new Set([rootId]);
    return this.populate.build(
      table.fields,
      table.groups,
      getDataConnection(),
      undefined,
      ancestors,
    );
  }

  private transformRow(doc: unknown, fields: IField[] = []): IRow {
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
    // Read-compat: embrulha em array a FK single dos campos OWNS_FK.
    this.relationship.normalizeReadProjection(fields, json);
    assertIRow(json);
    return json;
  }

  // ── Core CRUD ─────────────────────────────────────────────

  async create(payload: RowCreatePayload): Promise<IRow> {
    const model = await this.getModel(payload.table);
    const populate = await this.getPopulate(payload.table);

    const fields = payload.table.fields ?? [];
    const { data, pending } = this.relationship.extract(fields, payload.data);

    const created = await model.create(data);

    // Fallback compensatorio (Mongo standalone, sem transacao): persiste os
    // links apos a row; em falha de cardinalidade, desfaz a row e propaga.
    try {
      await this.relationship.persist(fields, created._id.toString(), pending);
    } catch (error) {
      await model.findOneAndDelete({ _id: created._id });
      throw error;
    }

    await this.hydrateRelationships(fields, [created]);
    const populated = await created.populate(populate);

    return this.transformRow(populated, fields);
  }

  async findOne(payload: RowFindOnePayload): Promise<IRow | null> {
    const model = await this.getModel(payload.table);
    const row = await model.findOne(payload.query);

    if (!row) return null;

    const shouldPopulate = payload.populate !== false;
    if (shouldPopulate) {
      const populate = await this.getPopulate(payload.table);
      await this.hydrateRelationships(payload.table.fields ?? [], [row]);
      await row.populate(populate);
    }

    return this.transformRow(row, payload.table.fields ?? []);
  }

  async findMany(payload: RowFindManyPayload): Promise<IRow[]> {
    const model = await this.getModel(payload.table);
    const populate = await this.getPopulate(payload.table);

    const conn = getDataConnection();
    const baseQuery = await this.query.build(
      payload.rawFilters ?? {},
      payload.table.fields ?? [],
      payload.table.groups,
      payload.table.slug,
      conn,
    );

    // Mescla fragmento do guardQuery via $and para que o row-access-guard
    // possa restringir a listagem sem conhecer a query base.
    let query: Record<string, unknown> = baseQuery;
    if (payload.guardQuery && Object.keys(payload.guardQuery).length > 0) {
      query = { $and: [baseQuery, payload.guardQuery] };
    }

    if (payload.excludeIds && payload.excludeIds.length > 0) {
      const excludeObjectIds = payload.excludeIds.map(
        (id) => new mongoose.Types.ObjectId(id),
      );
      query = { $and: [query, { _id: { $nin: excludeObjectIds } }] };
    }

    const sort = this.query.order(
      payload.rawFilters ?? {},
      payload.table.fields ?? [],
      payload.table.order,
    );

    const slug = payload.table.slug;

    const rows = await model
      .find(query)
      .skip(payload.skip)
      .limit(payload.limit)
      .sort(sort);

    console.info(
      `[row.repository > findMany] slug=${slug} found=${rows.length} ` +
        `query=${JSON.stringify(query)}`,
    );

    const fields = payload.table.fields ?? [];

    try {
      await this.hydrateRelationships(fields, rows);
    } catch (error) {
      console.error(
        `[row.repository > findMany][hydrate-error] slug=${slug} ` +
          `rows=${rows.length}:`,
        error,
      );
      throw error;
    }

    try {
      await model.populate(rows, populate);
    } catch (error) {
      console.error(
        `[row.repository > findMany][populate-error] slug=${slug} ` +
          `rows=${rows.length} paths=${JSON.stringify(populate.map((p) => p.path))}:`,
        error,
      );
      throw error;
    }

    return rows.map((row) => this.transformRow(row, fields));
  }

  async count(
    table: RowTableContext,
    rawFilters?: Record<string, unknown>,
    guardQuery?: Record<string, unknown>,
    excludeIds?: string[],
  ): Promise<number> {
    const model = await this.getModel(table);
    const baseQuery = await this.query.build(
      rawFilters ?? {},
      table.fields ?? [],
      table.groups,
      table.slug,
      getDataConnection(),
    );
    const parts: Record<string, unknown>[] = [baseQuery];
    if (guardQuery && Object.keys(guardQuery).length > 0)
      parts.push(guardQuery);
    if (excludeIds && excludeIds.length > 0) {
      parts.push({
        _id: { $nin: excludeIds.map((id) => new mongoose.Types.ObjectId(id)) },
      });
    }
    let query: Record<string, unknown> = { $and: parts };
    if (parts.length === 1) query = parts[0];
    return model.countDocuments(query);
  }

  async countFieldValue(
    table: RowTableContext,
    fieldSlug: string,
    value: unknown,
    excludeRowId: string | null = null,
  ): Promise<number> {
    const model = await this.getModel(table);
    const filter: Record<string, unknown> = {
      [fieldSlug]: value,
      trashedAt: null,
    };
    if (excludeRowId) filter._id = { $ne: excludeRowId };
    return model.countDocuments(filter);
  }

  async update(payload: RowUpdatePayload): Promise<IRow> {
    const model = await this.getModel(payload.table);
    const populate = await this.getPopulate(payload.table);

    const fields = payload.table.fields ?? [];
    const { data, pending } = this.relationship.extract(fields, payload.data);

    // Links primeiro: reconcilia (e valida cardinalidade) antes de tocar a row,
    // evitando atualizacao parcial em caso de violacao.
    await this.relationship.persist(fields, payload._id, pending);

    const row = await model.findOneAndUpdate(
      { _id: payload._id },
      { $set: data },
      { new: true },
    );
    if (!row) throw new Error('Row not found');

    await this.hydrateRelationships(fields, [row]);
    await row.populate(populate);

    return this.transformRow(row, fields);
  }

  async deleteOne(table: RowTableContext, _id: string): Promise<boolean> {
    const model = await this.getModel(table);
    const result = await model.findOneAndDelete({ _id });
    return result !== null;
  }

  async clearFieldValue(
    table: RowTableContext,
    fieldSlug: string,
    value: string,
  ): Promise<number> {
    const model = await this.getModel(table);
    // mongoose converte `value` (string) para ObjectId pelo tipo do path FK.
    const result = await model.updateMany(
      { [fieldSlug]: value },
      { $set: { [fieldSlug]: null } },
    );
    return result.modifiedCount;
  }

  async listSlugs(
    table: RowTableContext,
    excludeId?: string,
  ): Promise<string[]> {
    const model = await this.getModel(table);

    const filter: Record<string, unknown> = {};
    if (excludeId) filter._id = { $ne: excludeId };

    const slugs = await model.distinct('sharedRowSlug', filter);

    return slugs.filter(
      (value): value is string => typeof value === 'string' && value.length > 0,
    );
  }

  // ── Trash (bulk) ──────────────────────────────────────────

  async bulkTrash(payload: RowBulkUpdatePayload): Promise<number> {
    const model = await this.getModel(payload.table);
    const result = await model.updateMany(
      {
        _id: { $in: payload.ids },
        trashedAt: null,
        ...(payload.creatorId && { creator: payload.creatorId }),
      },
      { $set: { trashedAt: new Date() } },
    );
    return result.modifiedCount;
  }

  async bulkRestore(payload: RowBulkUpdatePayload): Promise<number> {
    const model = await this.getModel(payload.table);
    const result = await model.updateMany(
      {
        _id: { $in: payload.ids },
        trashedAt: { $ne: null },
        ...(payload.creatorId && { creator: payload.creatorId }),
      },
      { $set: { trashedAt: null } },
    );
    return result.modifiedCount;
  }

  async bulkDelete(payload: RowBulkDeletePayload): Promise<number> {
    const model = await this.getModel(payload.table);
    const result = await model.deleteMany({
      _id: { $in: payload.ids },
      trashedAt: { $ne: null },
      ...(payload.creatorId && { creator: payload.creatorId }),
    });
    return result.deletedCount;
  }

  async emptyTrash(
    table: RowTableContext,
    creatorId?: string,
  ): Promise<number> {
    const model = await this.getModel(table);
    const result = await model.deleteMany({
      trashedAt: { $ne: null },
      ...(creatorId && { creator: creatorId }),
    });
    return result.deletedCount;
  }

  // ── Field-level (reaction / evaluation) ───────────────────

  async setFieldAndSave(payload: RowSetFieldPayload): Promise<IRow> {
    const model = await this.getModel(payload.table);
    const populate = await this.getPopulate(payload.table);

    // Update atomico do unico campo (reaction/evaluation): findOneAndUpdate nao
    // roda validators por padrao, evitando revalidar campos required nao
    // relacionados que estejam null em rows legadas/draft (full-doc .save()
    // quebrava com "Path X is required").
    const row = await model.findOneAndUpdate(
      { _id: payload._id },
      { $set: { [payload.field]: payload.value } },
      { new: true },
    );
    if (!row) throw new Error('Row not found');

    await this.hydrateRelationships(payload.table.fields ?? [], [row]);
    await row.populate(populate);

    return this.transformRow(row, payload.table.fields ?? []);
  }

  // ── Group rows (subdocumentos) ────────────────────────────

  async addGroupItem(
    payload: RowGroupItemPayload & { data: Record<string, unknown> },
  ): Promise<IRow> {
    const model = await this.getModel(payload.table);
    const populate = await this.getPopulate(payload.table);

    const row = await model.findOne({ _id: payload.rowId });
    if (!row) throw new Error('Row not found');

    const currentItems = row.get(payload.groupFieldSlug);
    let groupData: unknown[] = [];
    if (Array.isArray(currentItems)) groupData = [...currentItems];
    groupData.push(payload.data);

    row.set(payload.groupFieldSlug, groupData);
    await row.save();
    await this.hydrateRelationships(payload.table.fields ?? [], [row]);
    await row.populate(populate);

    return this.transformRow(row, payload.table.fields ?? []);
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
    const model = await this.getModel(payload.table);
    const populate = await this.getPopulate(payload.table);

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
    await this.hydrateRelationships(payload.table.fields ?? [], [row]);
    await row.populate(populate);

    return this.transformRow(row, payload.table.fields ?? []);
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
    const populate = await this.getPopulate(table);

    const row = await model.findOneAndUpdate(filter, update, { new: true });
    if (!row) return null;

    await this.hydrateRelationships(table.fields ?? [], [row]);
    await row.populate(populate);

    return this.transformRow(row, table.fields ?? []);
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
    const docs = await model.find({ trashedAt: null }).lean();
    return docs.map((doc): Record<string, unknown> => ({ ...doc }));
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
      doc.set('creator', creator);
    }
    const result = await doc.collection.insertOne(doc.toObject());
    // Modelo dinâmico: toObject() não expõe createdAt/updatedAt/trashedAt no
    // tipo estático. Materializamos os campos de Base explicitamente para montar
    // um IRow válido sem asserção; o índice `Record<string, unknown>` de IRow
    // cobre os demais campos dinâmicos.
    const plain: Record<string, unknown> = doc.toObject();
    const now = new Date();
    const insertedRow: IRow = {
      ...plain,
      _id: result.insertedId.toString(),
      createdAt: now,
      updatedAt: now,
      trashedAt: null,
    };
    return insertedRow;
  }

  // ── Resolver helpers (csv-import) ─────────────────────────

  async findManyByFieldValues(
    table: RowTableContext,
    fieldSlugs: string[],
    values: string[],
  ): Promise<IRow[]> {
    if (fieldSlugs.length === 0 || values.length === 0) return [];

    const model = await this.getModel(table);
    const orClauses = fieldSlugs.map((slug) => ({
      [slug]: { $in: values },
    }));

    const docs = await model.find({ $or: orClauses, trashedAt: null }).lean();

    const fields = table.fields ?? [];
    return docs.map((doc) => this.transformRow(doc, fields));
  }

  // ── updateMany (backfill / guard) ─────────────────────────

  async updateMany(payload: RowUpdateManyPayload): Promise<number> {
    const model = await this.getModel(payload.table);
    const result = await model.updateMany(payload.filter, payload.update);
    return result.modifiedCount;
  }

  // ── Category cleanup (delete-category) ────────────────────

  async pullCategoryValues(
    table: RowTableContext,
    fieldSlug: string,
    ids: string[],
  ): Promise<number> {
    if (ids.length === 0) return 0;

    const model = await this.getModel(table);
    const result = await model.updateMany(
      { [fieldSlug]: { $in: ids } },
      { $pull: { [fieldSlug]: { $in: ids } } },
    );

    return result.modifiedCount;
  }
}
