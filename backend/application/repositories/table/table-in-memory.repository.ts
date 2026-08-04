import type {
  FindOptions,
  IField,
  IStorage,
  ITable,
  IUser,
} from '@application/core/entity.core';
import { InMemoryCollectionRepository } from '@application/repositories/in-memory-base.repository';

import { EntityFixtures } from '../entity-fixtures';

import type {
  TableContractRepository,
  TableCreatePayload,
  TableQueryPayload,
  TableUpdateManyPayload,
  TableUpdatePayload,
} from './table-contract.repository';

const fixtures = new EntityFixtures();

// Refs do double de teste: entidade completa (defaults inertes) a partir do id.

export default class TableInMemoryRepository
  extends InMemoryCollectionRepository<ITable>
  implements TableContractRepository
{
  private storageRef(id: string): IStorage {
    return fixtures.makeStorage(id);
  }
  private userRef(id: string): IUser {
    return fixtures.makeUser(id);
  }
  private fieldRef(id: string): IField {
    return fixtures.makeField(id);
  }

  async create(payload: TableCreatePayload): Promise<ITable> {
    this.checkError('create');
    let logo: IStorage | null = null;
    if (payload.logo) logo = this.storageRef(payload.logo);
    const table: ITable = {
      _id: crypto.randomUUID(),
      _schema: payload._schema ?? {},
      name: payload.name,
      description: payload.description ?? null,
      logo,
      slug: payload.slug,
      fields: (payload.fields ?? []).map((f) => {
        if (typeof f === 'object') return f;
        return this.fieldRef(f);
      }),
      type: payload.type ?? 'TABLE',
      style: payload.style ?? 'LIST',
      owner: this.userRef(payload.owner),
      permissions: payload.permissions ?? null,
      members: payload.members ?? [],
      fieldOrderList: payload.fieldOrderList ?? [],
      fieldOrderForm: payload.fieldOrderForm ?? [],
      fieldOrderFilter: payload.fieldOrderFilter ?? [],
      fieldOrderDetail: payload.fieldOrderDetail ?? [],
      methods: payload.methods ?? {
        onLoad: { code: null },
        beforeSave: { code: null },
        afterSave: { code: null },
      },
      groups: payload.groups ?? [],
      order: payload.order ?? null,
      layoutFields: payload.layoutFields ?? {
        title: null,
        description: null,
        cover: null,
        category: null,
        startDate: null,
        endDate: null,
        color: null,
        participants: null,
        reminder: null,
      },
      rowSlugFieldId: payload.rowSlugFieldId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      trashedAt: null,
      trashed: false,
    };
    this.items.push(table);
    return table;
  }

  async findById(_id: string, options?: FindOptions): Promise<ITable | null> {
    this.checkError('findById');
    const item = this.items.find((i) => {
      if (i._id !== _id) return false;
      return this.matchesTrashed(i, options);
    });
    return item ?? null;
  }

  async findBySlug(
    slug: string,
    options?: FindOptions,
  ): Promise<ITable | null> {
    this.checkError('findBySlug');
    const item = this.items.find((i) => {
      if (i.slug !== slug) return false;
      return this.matchesTrashed(i, options);
    });
    return item ?? null;
  }

  async findMany(payload?: TableQueryPayload): Promise<ITable[]> {
    this.checkError('findMany');
    let filtered = this.items;

    // Filtro de trashed
    if (payload?.trashed !== undefined) {
      filtered = filtered.filter((t) => t.trashed === payload.trashed);
    } else {
      filtered = filtered.filter((t) => !t.trashed);
    }

    // Filtro por múltiplos IDs
    if (payload?._ids && payload._ids.length > 0) {
      filtered = filtered.filter((t) => payload._ids!.includes(t._id));
    }

    if (payload?.search) {
      const search = payload.search.toLowerCase();
      filtered = filtered.filter((t) => t.name.toLowerCase().includes(search));
    }

    if (payload?.type) {
      filtered = filtered.filter((t) => t.type === payload.type);
    }

    if (payload?.owner?.length) {
      const ownerIds = payload.owner;
      filtered = filtered.filter((t) =>
        ownerIds.includes(String(t.owner?._id)),
      );
    }

    filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));

    filtered = this.paginate(filtered, payload);

    return filtered;
  }

  async update({ _id, ...payload }: TableUpdatePayload): Promise<ITable> {
    this.checkError('update');
    const table = this.items.find((t) => t._id === _id);
    if (!table) throw new Error('Table not found');

    if (payload.logo !== undefined) {
      table.logo = null;
      if (payload.logo) table.logo = this.storageRef(payload.logo);
    }
    if (payload.fields !== undefined) {
      table.fields = payload.fields.map((f) => this.fieldRef(f));
    }
    if (payload.owner !== undefined) {
      table.owner = this.userRef(payload.owner);
    }
    if (payload.permissions !== undefined) {
      table.permissions = payload.permissions;
    }
    if (payload.members !== undefined) {
      table.members = payload.members;
    }
    if (payload.style !== undefined) {
      table.style = payload.style;
    }
    if (payload.fieldOrderList !== undefined) {
      table.fieldOrderList = payload.fieldOrderList;
    }
    if (payload.fieldOrderForm !== undefined) {
      table.fieldOrderForm = payload.fieldOrderForm;
    }
    if (payload.fieldOrderFilter !== undefined) {
      table.fieldOrderFilter = payload.fieldOrderFilter;
    }
    if (payload.fieldOrderDetail !== undefined) {
      table.fieldOrderDetail = payload.fieldOrderDetail;
    }
    if (payload.groups !== undefined) {
      table.groups = payload.groups;
    }
    if (payload.name !== undefined) table.name = payload.name;
    if (payload.description !== undefined)
      table.description = payload.description;
    if (payload.slug !== undefined) table.slug = payload.slug;
    if (payload.type !== undefined) table.type = payload.type;
    if (payload._schema !== undefined) table._schema = payload._schema;
    if (payload.methods !== undefined) table.methods = payload.methods;
    if (payload.rowSlugFieldId !== undefined)
      table.rowSlugFieldId = payload.rowSlugFieldId;
    if (payload.trashed !== undefined) table.trashed = payload.trashed;
    if (payload.trashedAt !== undefined) table.trashedAt = payload.trashedAt;

    table.updatedAt = new Date();
    return table;
  }

  async updateMany({
    _ids,
    type,
    filterTrashed,
    data,
  }: TableUpdateManyPayload): Promise<number> {
    this.checkError('updateMany');
    let filtered = this.items.filter((t) => _ids.includes(t._id));

    if (type) {
      filtered = filtered.filter((t) => t.type === type);
    }

    if (filterTrashed !== undefined) {
      filtered = filtered.filter((t) => t.trashed === filterTrashed);
    }

    for (const table of filtered) {
      if (data.style) table.style = data.style;
      if (data.trashed !== undefined) table.trashed = data.trashed;
      if (data.trashedAt !== undefined) table.trashedAt = data.trashedAt;
      table.updatedAt = new Date();
    }

    return filtered.length;
  }

  async delete(_id: string): Promise<void> {
    this.checkError('delete');
    this.removeById(_id, 'Table');
  }

  async count(payload?: TableQueryPayload): Promise<number> {
    this.checkError('count');
    const filtered = await this.findMany({
      ...payload,
      page: undefined,
      perPage: undefined,
    });
    return filtered.length;
  }

  async dropCollection(_slug: string): Promise<void> {
    // No-op em memória — os registros não existem separadamente
  }

  async renameSlug(oldSlug: string, newSlug: string): Promise<void> {
    const table = this.items.find((t) => t.slug === oldSlug);
    if (table) {
      table.slug = newSlug;
    }
  }

  async findByFieldIds(fieldIds: string[]): Promise<ITable[]> {
    return this.items.filter(
      (t) => !t.trashed && t.fields.some((f) => fieldIds.includes(f._id)),
    );
  }
}
