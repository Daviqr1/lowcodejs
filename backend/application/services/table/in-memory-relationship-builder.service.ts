import type { Either } from '@application/core/either.core';
import { right } from '@application/core/either.core';
import type {
  IField,
  IRelationshipDefinition,
  IRelationshipLink,
} from '@application/core/entity.core';
import type HTTPException from '@application/core/exception.core';
import type { RelationshipLinkSide } from '@application/repositories/relationship-link/relationship-link-contract.repository';

import type {
  PendingRelationship,
  RelationshipExtractResult,
  RelationshipHydratableDoc,
} from './relationship-builder-contract.service';
import { RelationshipBuilderContractService } from './relationship-builder-contract.service';

export default class InMemoryRelationshipBuilderService extends RelationshipBuilderContractService {
  async hydrate(
    _fields: IField[],
    _docs: RelationshipHydratableDoc[],
  ): Promise<void> {}

  extract(
    _fields: IField[],
    data: Record<string, unknown>,
  ): RelationshipExtractResult {
    return { data, pending: [] };
  }

  normalizeReadProjection(
    _fields: IField[],
    _row: Record<string, unknown>,
  ): void {}

  async resolveRelationshipFilter(
    _field: IField,
    _otherIds: string[],
  ): Promise<Record<string, unknown> | null> {
    return null;
  }

  async persist(
    _fields: IField[],
    _recordId: string,
    _pending: PendingRelationship[],
  ): Promise<void> {}

  hasManagedRelationships(_fields: IField[]): boolean {
    return false;
  }

  async listFkLinks(
    _definition: IRelationshipDefinition,
    _side: RelationshipLinkSide,
    _recordId: string,
    _page: number,
    _perPage: number,
  ): Promise<{ data: IRelationshipLink[]; total: number }> {
    return { data: [], total: 0 };
  }

  async linkFk(
    _definition: IRelationshipDefinition,
    _side: RelationshipLinkSide,
    _recordId: string,
    _otherId: string,
  ): Promise<IRelationshipLink> {
    throw new Error(
      'InMemoryRelationshipBuilderService.linkFk not implemented',
    );
  }

  async unlinkFk(
    _definition: IRelationshipDefinition,
    _linkId: string,
  ): Promise<void> {}

  async ensureUnlinkKeepsRequired(
    _definition: IRelationshipDefinition,
    _linkId: string,
  ): Promise<Either<HTTPException, true>> {
    return right(true);
  }

  async findOccupiedIds(
    _definition: IRelationshipDefinition,
    _queriedSide: RelationshipLinkSide,
    _excludeForRecordId?: string,
  ): Promise<string[]> {
    return [];
  }
}
