import { Service } from 'fastify-decorators';

import type { IExtension } from '@application/core/entity.core';
import { E_EXTENSION_TYPE } from '@application/core/entity.core';
import { Extension as Model } from '@application/model/extension.model';

import type {
  ExtensionAvailabilityKey,
  ExtensionContractRepository,
  ExtensionQueryPayload,
  ExtensionToggleEnabledPayload,
  ExtensionType,
  ExtensionUpdateTableScopePayload,
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
    if (payload?.slot) where.slot = payload.slot;
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

  async upsert(payload: ExtensionUpsertPayload): Promise<IExtension> {
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
      enabled: false,
      available: true,
      tableScope: { mode: 'all', tableIds: [] },
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

  async findActiveForTable(tableId: string): Promise<IExtension[]> {
    const docs = await Model.find({
      enabled: true,
      available: true,
      type: E_EXTENSION_TYPE.PLUGIN,
      $or: [
        { 'tableScope.mode': 'all' },
        { 'tableScope.mode': 'specific', 'tableScope.tableIds': tableId },
      ],
    });
    return docs.map((d) => this.transform(d));
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
}
