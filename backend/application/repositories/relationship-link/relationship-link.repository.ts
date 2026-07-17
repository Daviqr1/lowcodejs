import { Service } from 'fastify-decorators';

import type { IRelationshipLink } from '@application/core/entity.core';
import { RelationshipLink as Model } from '@application/model/relationship-link.model';

import type {
  RelationshipLinkContractRepository,
  RelationshipLinkCountPayload,
  RelationshipLinkCreatePayload,
  RelationshipLinkExistsPayload,
  RelationshipLinkPage,
  RelationshipLinkPaginatePayload,
  RelationshipLinkSide,
} from './relationship-link-contract.repository';

@Service()
export default class RelationshipLinkMongooseRepository implements RelationshipLinkContractRepository {
  private transform(entity: InstanceType<typeof Model>): IRelationshipLink {
    const json = entity.toJSON({ flattenObjectIds: true });
    return {
      ...json,
      _id: entity._id.toString(),
      relationshipId: String(json.relationshipId),
      sourceId: String(json.sourceId),
      targetId: String(json.targetId),
    };
  }

  async create(
    payload: RelationshipLinkCreatePayload,
  ): Promise<IRelationshipLink> {
    const created = await Model.create({
      relationshipId: payload.relationshipId,
      sourceId: payload.sourceId,
      targetId: payload.targetId,
      order: payload.order ?? 0,
      metadata: payload.metadata ?? null,
    });
    return this.transform(created);
  }

  async exists(payload: RelationshipLinkExistsPayload): Promise<boolean> {
    const found = await Model.exists({
      relationshipId: payload.relationshipId,
      sourceId: payload.sourceId,
      targetId: payload.targetId,
    });
    return found !== null;
  }

  async findById(_id: string): Promise<IRelationshipLink | null> {
    const link = await Model.findById(_id);
    if (!link) return null;
    return this.transform(link);
  }

  async findBySource(
    relationshipId: string,
    sourceId: string,
  ): Promise<IRelationshipLink[]> {
    const links = await Model.find({ relationshipId, sourceId }).sort({
      order: 'asc',
    });
    return links.map((link) => this.transform(link));
  }

  async findByTarget(
    relationshipId: string,
    targetId: string,
  ): Promise<IRelationshipLink[]> {
    const links = await Model.find({ relationshipId, targetId }).sort({
      order: 'asc',
    });
    return links.map((link) => this.transform(link));
  }

  async findManyBySide(
    relationshipId: string,
    side: RelationshipLinkSide,
    recordIds: string[],
  ): Promise<IRelationshipLink[]> {
    if (recordIds.length === 0) return [];

    let where: Record<string, unknown> = {
      relationshipId,
      sourceId: { $in: recordIds },
    };
    if (side === 'target') {
      where = { relationshipId, targetId: { $in: recordIds } };
    }

    const links = await Model.find(where).sort({ order: 'asc' });
    return links.map((link) => this.transform(link));
  }

  async paginateBySide(
    payload: RelationshipLinkPaginatePayload,
  ): Promise<RelationshipLinkPage> {
    const where = this.sideWhere(
      payload.relationshipId,
      payload.side,
      payload.recordId,
    );
    const skip = (payload.page - 1) * payload.perPage;

    const [links, total] = await Promise.all([
      Model.find(where)
        .sort({ order: 'asc' })
        .skip(skip)
        .limit(payload.perPage),
      Model.countDocuments(where),
    ]);

    return {
      data: links.map((link) => this.transform(link)),
      total,
    };
  }

  async count(
    relationshipId: string,
    where: RelationshipLinkCountPayload,
  ): Promise<number> {
    const filter: Record<string, unknown> = { relationshipId };
    if (where.sourceId) filter.sourceId = where.sourceId;
    if (where.targetId) filter.targetId = where.targetId;
    return Model.countDocuments(filter);
  }

  async countByRecord(
    relationshipId: string,
    recordId: string,
  ): Promise<number> {
    return Model.countDocuments({
      relationshipId,
      $or: [{ sourceId: recordId }, { targetId: recordId }],
    });
  }

  async setOrder(_id: string, order: number): Promise<void> {
    await Model.updateOne({ _id }, { $set: { order } });
  }

  async delete(_id: string): Promise<void> {
    await Model.deleteOne({ _id });
  }

  async deleteByRecord(
    relationshipId: string,
    recordId: string,
  ): Promise<void> {
    await Model.deleteMany({
      relationshipId,
      $or: [{ sourceId: recordId }, { targetId: recordId }],
    });
  }

  async deleteByRelationship(relationshipId: string): Promise<void> {
    await Model.deleteMany({ relationshipId });
  }

  async findAllLinkedIds(
    relationshipId: string,
    side: RelationshipLinkSide,
  ): Promise<string[]> {
    let field: 'sourceId' | 'targetId' = 'targetId';
    if (side === 'source') field = 'sourceId';
    const links = await Model.find(
      { relationshipId },
      { [field]: 1, _id: 0 },
    ).lean();
    const ids: string[] = [];
    for (const link of links) {
      const id = link[field];
      if (id) ids.push(String(id));
    }
    return ids;
  }

  private sideWhere(
    relationshipId: string,
    side: RelationshipLinkPaginatePayload['side'],
    recordId: string,
  ): Record<string, unknown> {
    if (side === 'source') {
      return { relationshipId, sourceId: recordId };
    }
    return { relationshipId, targetId: recordId };
  }
}
