import type { IRelationshipLink } from '@application/core/entity.core';
import { InMemoryCollectionRepository } from '@application/repositories/in-memory-base.repository';

import type {
  RelationshipLinkContractRepository,
  RelationshipLinkCountPayload,
  RelationshipLinkCreatePayload,
  RelationshipLinkExistsPayload,
  RelationshipLinkPage,
  RelationshipLinkPaginatePayload,
  RelationshipLinkSide,
} from './relationship-link-contract.repository';

export default class RelationshipLinkInMemoryRepository
  extends InMemoryCollectionRepository<IRelationshipLink>
  implements RelationshipLinkContractRepository
{
  async create(
    payload: RelationshipLinkCreatePayload,
  ): Promise<IRelationshipLink> {
    const link: IRelationshipLink = {
      _id: crypto.randomUUID(),
      relationshipId: payload.relationshipId,
      sourceId: payload.sourceId,
      targetId: payload.targetId,
      order: payload.order ?? 0,
      metadata: payload.metadata ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.items.push(link);
    return link;
  }

  async exists(payload: RelationshipLinkExistsPayload): Promise<boolean> {
    return this.items.some(
      (link) =>
        link.relationshipId === payload.relationshipId &&
        link.sourceId === payload.sourceId &&
        link.targetId === payload.targetId,
    );
  }

  async findById(_id: string): Promise<IRelationshipLink | null> {
    return this.items.find((link) => link._id === _id) ?? null;
  }

  async findBySource(
    relationshipId: string,
    sourceId: string,
  ): Promise<IRelationshipLink[]> {
    return this.items
      .filter(
        (link) =>
          link.relationshipId === relationshipId && link.sourceId === sourceId,
      )
      .sort((a, b) => a.order - b.order);
  }

  async findByTarget(
    relationshipId: string,
    targetId: string,
  ): Promise<IRelationshipLink[]> {
    return this.items
      .filter(
        (link) =>
          link.relationshipId === relationshipId && link.targetId === targetId,
      )
      .sort((a, b) => a.order - b.order);
  }

  async findManyBySide(
    relationshipId: string,
    side: RelationshipLinkSide,
    recordIds: string[],
  ): Promise<IRelationshipLink[]> {
    if (recordIds.length === 0) return [];

    const ids = new Set(recordIds);
    return this.items
      .filter((link) => {
        if (link.relationshipId !== relationshipId) return false;
        if (side === 'source') return ids.has(link.sourceId);
        return ids.has(link.targetId);
      })
      .sort((a, b) => a.order - b.order);
  }

  async paginateBySide(
    payload: RelationshipLinkPaginatePayload,
  ): Promise<RelationshipLinkPage> {
    const all = this.bySide(
      payload.relationshipId,
      payload.side,
      payload.recordId,
    );
    const start = (payload.page - 1) * payload.perPage;
    const end = start + payload.perPage;
    return {
      data: all.slice(start, end),
      total: all.length,
    };
  }

  async count(
    relationshipId: string,
    where: RelationshipLinkCountPayload,
  ): Promise<number> {
    return this.items.filter((link) => {
      if (link.relationshipId !== relationshipId) return false;
      if (where.sourceId && link.sourceId !== where.sourceId) return false;
      if (where.targetId && link.targetId !== where.targetId) return false;
      return true;
    }).length;
  }

  async countByRecord(
    relationshipId: string,
    recordId: string,
  ): Promise<number> {
    return this.items.filter(
      (link) =>
        link.relationshipId === relationshipId &&
        (link.sourceId === recordId || link.targetId === recordId),
    ).length;
  }

  async setOrder(_id: string, order: number): Promise<void> {
    const link = this.items.find((item) => item._id === _id);
    if (link) link.order = order;
  }

  async delete(_id: string): Promise<void> {
    const index = this.items.findIndex((link) => link._id === _id);
    if (index !== -1) this.items.splice(index, 1);
  }

  async deleteByRecord(
    relationshipId: string,
    recordId: string,
  ): Promise<void> {
    this.items = this.items.filter(
      (link) =>
        !(
          link.relationshipId === relationshipId &&
          (link.sourceId === recordId || link.targetId === recordId)
        ),
    );
  }

  async deleteByRelationship(relationshipId: string): Promise<void> {
    this.items = this.items.filter(
      (link) => link.relationshipId !== relationshipId,
    );
  }

  async findAllLinkedIds(
    relationshipId: string,
    side: RelationshipLinkSide,
  ): Promise<string[]> {
    let field: 'sourceId' | 'targetId' = 'targetId';
    if (side === 'source') field = 'sourceId';
    return this.items
      .filter((link) => link.relationshipId === relationshipId)
      .map((link) => link[field]);
  }

  private bySide(
    relationshipId: string,
    side: RelationshipLinkPaginatePayload['side'],
    recordId: string,
  ): IRelationshipLink[] {
    const matches = this.items.filter((link) => {
      if (link.relationshipId !== relationshipId) return false;
      if (side === 'source') return link.sourceId === recordId;
      return link.targetId === recordId;
    });
    return matches.sort((a, b) => a.order - b.order);
  }
}
