import { Service } from 'fastify-decorators';

import type { IExtension } from '@application/core/entity.core';
import { Extension as Model } from '@application/model/extension.model';

import type {
  ExtensionAvailabilityKey,
  ExtensionContractRepository,
  ExtensionQueryPayload,
  ExtensionToggleEnabledPayload,
  ExtensionType,
  ExtensionUpdateTableScopePayload,
  ExtensionUpdateTableSettingsPayload,
  ExtensionUpsertOptions,
  ExtensionUpsertPayload,
} from './extension-contract.repository';

@Service()
export default class ExtensionMongooseRepository implements ExtensionContractRepository {
  private transform(entity: InstanceType<typeof Model>): IExtension {
    return {
      ...entity.toJSON({ flattenObjectIds: true }),
      _id: entity._id.toString(),
    };
  }

  private buildWhereClause(
    payload?: ExtensionQueryPayload,
  ): Record<string, unknown> {
    const where: Record<string, unknown> = { trashed: false };

    if (payload?.type) where.type = payload.type;
    if (payload?.enabled !== undefined) where.enabled = payload.enabled;
    if (payload?.slot) where.slots = payload.slot;
    if (payload?.available !== undefined) where.available = payload.available;

    return where;
  }

  async findById(_id: string): Promise<IExtension | null> {
    const doc = await Model.findOne({ _id, trashed: false });
    if (!doc) return null;
    return this.transform(doc);
  }

  async findByKey(
    pkg: string,
    type: ExtensionType,
    extensionId: string,
  ): Promise<IExtension | null> {
    const doc = await Model.findOne({ pkg, type, extensionId, trashed: false });
    if (!doc) return null;
    return this.transform(doc);
  }

  async findMany(payload?: ExtensionQueryPayload): Promise<IExtension[]> {
    const where = this.buildWhereClause(payload);
    const docs = await Model.find(where).sort({
      pkg: 'asc',
      type: 'asc',
      name: 'asc',
    });
    return docs.map((d) => this.transform(d));
  }

  async upsert(
    payload: ExtensionUpsertPayload,
    options?: ExtensionUpsertOptions,
  ): Promise<IExtension> {
    const { pkg, type, extensionId, ...rest } = payload;

    const existing = await Model.findOne({ pkg, type, extensionId });

    if (existing) {
      // Atualiza apenas metadados do manifesto. Preserva enabled, tableScope e
      // available (resetado pelo loader em pass separado).
      existing.set({
        ...rest,
        available: true,
      });
      await existing.save();
      return this.transform(existing);
    }

    const created = await Model.create({
      pkg,
      type,
      extensionId,
      ...rest,
      enabled: options?.enabledOnInsert ?? false,
      available: true,
      tableScope: { mode: 'all', tableIds: [] },
      permissions: rest.permissions ?? { view: [] },
    });
    return this.transform(created);
  }

  async toggleEnabled({
    _id,
    enabled,
  }: ExtensionToggleEnabledPayload): Promise<IExtension> {
    const doc = await Model.findOne({ _id });
    if (!doc) throw new Error('Extension not found');
    doc.set({ enabled });
    await doc.save();
    return this.transform(doc);
  }

  async updateTableScope({
    _id,
    tableScope,
  }: ExtensionUpdateTableScopePayload): Promise<IExtension> {
    const doc = await Model.findOne({ _id });
    if (!doc) throw new Error('Extension not found');
    doc.set({ tableScope });
    await doc.save();
    return this.transform(doc);
  }

  async markUnavailableExcept(
    presentKeys: ExtensionAvailabilityKey[],
  ): Promise<number> {
    if (presentKeys.length === 0) {
      const result = await Model.updateMany(
        { available: true },
        { $set: { available: false } },
      );
      return result.modifiedCount;
    }

    const $nor = presentKeys.map(({ pkg, type, extensionId }) => ({
      pkg,
      type,
      extensionId,
    }));

    const result = await Model.updateMany(
      { available: true, $nor },
      { $set: { available: false } },
    );
    return result.modifiedCount;
  }

  async updateTableSettings({
    _id,
    tableId,
    settings,
  }: ExtensionUpdateTableSettingsPayload): Promise<IExtension> {
    const doc = await Model.findOne({ _id });
    if (!doc) throw new Error('Extension not found');
    // tableSettings e um campo Mixed — usamos dot-notation no $set para
    // atualizar apenas a key do tableId sem sobrescrever os demais.
    await Model.updateOne(
      { _id },
      { $set: { [`tableSettings.${tableId}`]: settings } },
    );
    const updated = await Model.findOne({ _id });
    if (!updated) throw new Error('Extension not found after update');
    return this.transform(updated);
  }

  async findActiveForTable(tableId: string): Promise<IExtension[]> {
    const docs = await Model.find({
      enabled: true,
      available: true,
      trashed: false,
      $or: [
        { 'tableScope.mode': 'all' },
        { 'tableScope.mode': 'specific', 'tableScope.tableIds': tableId },
      ],
    }).sort({ pkg: 'asc', type: 'asc', name: 'asc' });
    return docs.map((d) => this.transform(d));
  }
}
