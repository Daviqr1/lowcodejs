import type { FindOptions, IField } from '@application/core/entity.core';
import { InMemoryRepository } from '@application/repositories/in-memory-base.repository';

import type {
  FieldContractRepository,
  FieldCreatePayload,
  FieldQueryPayload,
  FieldUpdatePayload,
} from './field-contract.repository';

export default class FieldInMemoryRepository
  extends InMemoryRepository
  implements FieldContractRepository
{
  items: IField[] = [];

  async create(payload: FieldCreatePayload): Promise<IField> {
    const field: IField = {
      ...payload,
      allowCustomDropdownOptions: payload.allowCustomDropdownOptions ?? false,
      tip: payload.tip ?? null,
      _id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      trashedAt: null,
      trashed: false,
    };
    this.items.push(field);
    return field;
  }

  async createMany(payloads: FieldCreatePayload[]): Promise<IField[]> {
    const fields = payloads.map((payload) => ({
      ...payload,
      allowCustomDropdownOptions: payload.allowCustomDropdownOptions ?? false,
      tip: payload.tip ?? null,
      _id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      trashedAt: null,
      trashed: false,
    }));
    this.items.push(...fields);
    return fields;
  }

  async findById(_id: string, options?: FindOptions): Promise<IField | null> {
    const item = this.items.find((i) => {
      if (i._id !== _id) return false;
      if (options?.trashed !== undefined) return i.trashed === options.trashed;
      return true;
    });
    return item ?? null;
  }

  async findBySlug(
    slug: string,
    options?: FindOptions,
  ): Promise<IField | null> {
    const item = this.items.find((i) => {
      if (i.slug !== slug) return false;
      if (options?.trashed !== undefined) return i.trashed === options.trashed;
      return true;
    });
    return item ?? null;
  }

  async findMany(payload?: FieldQueryPayload): Promise<IField[]> {
    let filtered = this.items;

    if (payload?._ids && payload._ids.length > 0) {
      filtered = filtered.filter((f) => payload._ids!.includes(f._id));
    }

    if (payload?.search) {
      const search = payload.search.toLowerCase();
      filtered = filtered.filter((f) => f.name.toLowerCase().includes(search));
    }

    if (payload?.type) {
      filtered = filtered.filter((f) => f.type === payload.type);
    }

    filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));

    if (payload?.page && payload?.perPage) {
      const start = (payload.page - 1) * payload.perPage;
      const end = start + payload.perPage;
      filtered = filtered.slice(start, end);
    }

    return filtered;
  }

  async update({ _id, ...payload }: FieldUpdatePayload): Promise<IField> {
    const field = this.items.find((f) => f._id === _id);
    if (!field) throw new Error('Field not found');
    // Espelha o `$set` do Mongoose: chave `undefined` e descartada, nao apaga o
    // valor gravado. Sem isso o fake mentiria sobre updates parciais.
    const defined = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined),
    );
    Object.assign(field, defined, { updatedAt: new Date() });
    return field;
  }

  async delete(_id: string): Promise<void> {
    const index = this.items.findIndex((f) => f._id === _id);
    if (index === -1) throw new Error('Field not found');
    this.items.splice(index, 1);
  }

  async deleteMany(_ids: string[]): Promise<void> {
    this.items = this.items.filter((f) => !_ids.includes(f._id));
  }

  async count(payload?: FieldQueryPayload): Promise<number> {
    const filtered = await this.findMany({
      ...payload,
      page: undefined,
      perPage: undefined,
    });
    return filtered.length;
  }

  async updateRelationshipTableSlug(
    tableId: string,
    newSlug: string,
  ): Promise<void> {
    for (const field of this.items) {
      if (field.relationship?.table?._id === tableId) {
        field.relationship.table.slug = newSlug;
      }
    }
  }

  async findByRelationshipTableId(tableId: string): Promise<IField[]> {
    return this.items.filter(
      (f) => !f.trashed && f.relationship?.table?._id === tableId,
    );
  }
}
