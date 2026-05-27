import type { IExtension } from '@application/core/entity.core';
import { E_EXTENSION_TYPE } from '@application/core/entity.core';

import type {
  ExtensionAvailabilityKey,
  ExtensionBulkUpdateTableSettingsPayload,
  ExtensionContractRepository,
  ExtensionQueryPayload,
  ExtensionToggleEnabledPayload,
  ExtensionType,
  ExtensionUpdateTableScopePayload,
  ExtensionUpdateTableSettingsPayload,
  ExtensionUpsertPayload,
} from './extension-contract.repository';

export default class ExtensionInMemoryRepository implements ExtensionContractRepository {
  items: IExtension[] = [];

  async findById(_id: string): Promise<IExtension | null> {
    return this.items.find((i) => i._id === _id && !i.trashed) ?? null;
  }

  async findByKey(
    pkg: string,
    type: ExtensionType,
    extensionId: string,
  ): Promise<IExtension | null> {
    return (
      this.items.find(
        (i) =>
          i.pkg === pkg &&
          i.type === type &&
          i.extensionId === extensionId &&
          !i.trashed,
      ) ?? null
    );
  }

  async findMany(payload?: ExtensionQueryPayload): Promise<IExtension[]> {
    let filtered = this.items.filter((i) => !i.trashed);
    if (payload?.type) {
      filtered = filtered.filter((i) => i.type === payload.type);
    }
    if (payload?.enabled !== undefined) {
      filtered = filtered.filter((i) => i.enabled === payload.enabled);
    }
    if (payload?.slot) {
      filtered = filtered.filter((i) => i.slot === payload.slot);
    }
    if (payload?.available !== undefined) {
      filtered = filtered.filter((i) => i.available === payload.available);
    }
    return filtered.sort((a, b) => {
      if (a.pkg !== b.pkg) return a.pkg.localeCompare(b.pkg);
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.name.localeCompare(b.name);
    });
  }

  async upsert(payload: ExtensionUpsertPayload): Promise<IExtension> {
    const existing = this.items.find(
      (i) =>
        i.pkg === payload.pkg &&
        i.type === payload.type &&
        i.extensionId === payload.extensionId,
    );

    if (existing) {
      Object.assign(existing, payload, {
        available: true,
        updatedAt: new Date(),
      });
      return existing;
    }

    const created: IExtension = {
      ...payload,
      _id: crypto.randomUUID(),
      enabled: false,
      available: true,
      tableScope: { mode: 'all', tableIds: [] },
      tableSettings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      trashed: false,
      trashedAt: null,
    };
    this.items.push(created);
    return created;
  }

  async toggleEnabled({
    _id,
    enabled,
  }: ExtensionToggleEnabledPayload): Promise<IExtension> {
    const item = this.items.find((i) => i._id === _id);
    if (!item) throw new Error('Extension not found');
    item.enabled = enabled;
    item.updatedAt = new Date();
    return item;
  }

  async updateTableScope({
    _id,
    tableScope,
  }: ExtensionUpdateTableScopePayload): Promise<IExtension> {
    const item = this.items.find((i) => i._id === _id);
    if (!item) throw new Error('Extension not found');
    item.tableScope = tableScope;
    item.updatedAt = new Date();
    return item;
  }

  async updateTableSettings({
    _id,
    tableId,
    settings,
    expectedUpdatedAt,
  }: ExtensionUpdateTableSettingsPayload): Promise<IExtension | null> {
    const item = this.items.find((i) => i._id === _id);
    if (!item) return null;

    // Optimistic lock: se updatedAt não corresponde, retorna null (conflito)
    if (item.updatedAt?.getTime() !== expectedUpdatedAt.getTime()) {
      return null;
    }

    item.tableSettings = {
      ...(item.tableSettings ?? {}),
      [tableId]: settings,
    };
    item.updatedAt = new Date();
    return item;
  }

  async bulkUpdateTableSettings({
    _id,
    tableSettings,
    tableScope,
    expectedUpdatedAt,
  }: ExtensionBulkUpdateTableSettingsPayload): Promise<IExtension | null> {
    const item = this.items.find((i) => i._id === _id);
    if (!item) return null;
    if (item.updatedAt?.getTime() !== expectedUpdatedAt.getTime()) return null;
    item.tableSettings = tableSettings;
    item.tableScope = tableScope;
    item.updatedAt = new Date();
    return item;
  }

  async findActiveForTable(tableId: string): Promise<IExtension[]> {
    return this.items.filter((e) => {
      if (!e.enabled || !e.available) return false;
      if (e.type !== E_EXTENSION_TYPE.PLUGIN) return false;
      if (e.tableScope?.mode === 'all') return true;
      return Boolean(e.tableScope?.tableIds?.includes(tableId));
    });
  }

  async markUnavailableExcept(
    presentKeys: ExtensionAvailabilityKey[],
  ): Promise<number> {
    let count = 0;
    for (const item of this.items) {
      if (!item.available) continue;
      const isPresent = presentKeys.some(
        (k) =>
          k.pkg === item.pkg &&
          k.type === item.type &&
          k.extensionId === item.extensionId,
      );
      if (!isPresent) {
        item.available = false;
        item.updatedAt = new Date();
        count += 1;
      }
    }
    return count;
  }
}
