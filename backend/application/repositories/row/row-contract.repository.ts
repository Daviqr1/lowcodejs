/* eslint-disable no-unused-vars */
import type { IRow, ITable, Optional } from '@application/core/entity.core';

/**
 * Contexto de uma tabela dinamica para que o repositorio
 * consiga construir o modelo Mongoose e os populates.
 * Usa o mesmo tipo que buildTable() espera.
 */
export type RowTableContext = Optional<
  ITable,
  '_id' | 'createdAt' | 'updatedAt' | 'trashed' | 'trashedAt'
>;

// ── Payloads ────────────────────────────────────────────────

export type RowCreatePayload = {
  table: RowTableContext;
  data: Record<string, unknown>;
};

export type RowFindOnePayload = {
  table: RowTableContext;
  query: Record<string, unknown>;
  populate?: boolean;
  includeReverseRelationships?: boolean;
};

export type RowFindManyPayload = {
  table: RowTableContext;
  rawFilters?: Record<string, unknown>;
  skip: number;
  limit: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  includeReverseRelationships?: boolean;
};

export type RowUpdatePayload = {
  table: RowTableContext;
  _id: string;
  data: Record<string, unknown>;
};

export type RowSetFieldPayload = {
  table: RowTableContext;
  _id: string;
  field: string;
  value: unknown;
};

export type RowBulkUpdatePayload = {
  table: RowTableContext;
  ids: string[];
};

export type RowBulkDeletePayload = {
  table: RowTableContext;
  ids: string[];
};

export type RowGroupItemPayload = {
  table: RowTableContext;
  rowId: string;
  groupFieldSlug: string;
};

// ── Contrato ────────────────────────────────────────────────

export abstract class RowContractRepository {
  // ── Core CRUD ─────────────────────────────────────────────

  abstract create(payload: RowCreatePayload): Promise<IRow>;

  abstract findOne(payload: RowFindOnePayload): Promise<IRow | null>;

  abstract findMany(payload: RowFindManyPayload): Promise<IRow[]>;

  abstract count(
    table: RowTableContext,
    rawFilters?: Record<string, unknown>,
  ): Promise<number>;

  abstract update(payload: RowUpdatePayload): Promise<IRow | null>;

  abstract deleteOne(table: RowTableContext, _id: string): Promise<boolean>;

  // ── Trash (bulk) ──────────────────────────────────────────

  abstract bulkTrash(payload: RowBulkUpdatePayload): Promise<number>;

  abstract bulkRestore(payload: RowBulkUpdatePayload): Promise<number>;

  abstract bulkDelete(payload: RowBulkDeletePayload): Promise<number>;

  abstract emptyTrash(table: RowTableContext): Promise<number>;

  // ── Field-level (reaction / evaluation) ───────────────────

  abstract setFieldAndSave(payload: RowSetFieldPayload): Promise<IRow>;

  // ── Group rows (subdocumentos) ────────────────────────────

  abstract addGroupItem(
    payload: RowGroupItemPayload & { data: Record<string, unknown> },
  ): Promise<IRow>;

  abstract updateGroupItem(
    payload: RowGroupItemPayload & {
      itemId: string;
      data: Record<string, unknown>;
    },
  ): Promise<IRow>;

  abstract deleteGroupItem(
    payload: RowGroupItemPayload & { itemId: string },
  ): Promise<boolean>;

  // ── Atomic update (forum-message) ─────────────────────────

  abstract findOneAndUpdate(
    table: RowTableContext,
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
  ): Promise<IRow | null>;

  // ── Infrastructure-level ops (table/import/export tools) ──

  abstract renameField(
    table: RowTableContext,
    oldSlug: string,
    newSlug: string,
  ): Promise<void>;

  abstract findAllRaw(
    table: RowTableContext,
  ): Promise<Record<string, unknown>[]>;

  abstract insertRaw(
    table: RowTableContext,
    row: Record<string, unknown>,
    creator?: string,
  ): Promise<IRow>;

  abstract bulkSetMissingField(
    table: RowTableContext,
    fieldSlug: string,
    defaultValue: unknown,
  ): Promise<{ matched: number; modified: number }>;
}
