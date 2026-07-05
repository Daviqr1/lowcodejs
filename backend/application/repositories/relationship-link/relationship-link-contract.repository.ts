import type { IRelationshipLink } from '@application/core/entity.core';

export type RelationshipLinkSide = 'source' | 'target';

export type RelationshipLinkCreatePayload = {
  relationshipId: string;
  sourceId: string;
  targetId: string;
  order?: number;
  metadata?: Record<string, unknown> | null;
};

export type RelationshipLinkExistsPayload = {
  relationshipId: string;
  sourceId: string;
  targetId: string;
};

// Conta vinculos de um lado especifico (apenas um dos dois e informado).
export type RelationshipLinkCountPayload = {
  sourceId?: string;
  targetId?: string;
};

export type RelationshipLinkPaginatePayload = {
  relationshipId: string;
  side: RelationshipLinkSide;
  recordId: string;
  page: number;
  perPage: number;
};

export type RelationshipLinkPage = {
  data: IRelationshipLink[];
  total: number;
};

export abstract class RelationshipLinkContractRepository {
  abstract create(
    payload: RelationshipLinkCreatePayload,
  ): Promise<IRelationshipLink>;
  abstract exists(payload: RelationshipLinkExistsPayload): Promise<boolean>;
  abstract findById(_id: string): Promise<IRelationshipLink | null>;
  abstract findBySource(
    relationshipId: string,
    sourceId: string,
  ): Promise<IRelationshipLink[]>;
  abstract findByTarget(
    relationshipId: string,
    targetId: string,
  ): Promise<IRelationshipLink[]>;
  // Vinculos de varios registros de um mesmo lado numa unica query (batch da
  // pagina) — base da hidratacao N:N sem N+1.
  abstract findManyBySide(
    relationshipId: string,
    side: RelationshipLinkSide,
    recordIds: string[],
  ): Promise<IRelationshipLink[]>;
  abstract paginateBySide(
    payload: RelationshipLinkPaginatePayload,
  ): Promise<RelationshipLinkPage>;
  abstract count(
    relationshipId: string,
    where: RelationshipLinkCountPayload,
  ): Promise<number>;
  // Conta vinculos que tocam um registro em qualquer lado (RESTRICT no §9).
  abstract countByRecord(
    relationshipId: string,
    recordId: string,
  ): Promise<number>;
  abstract setOrder(_id: string, order: number): Promise<void>;
  abstract delete(_id: string): Promise<void>;
  // Remove os vinculos que tocam um registro em qualquer lado (SET_NULL/CASCADE).
  abstract deleteByRecord(
    relationshipId: string,
    recordId: string,
  ): Promise<void>;
  // Remove todos os vinculos de uma definicao (delete de tabela §9).
  abstract deleteByRelationship(relationshipId: string): Promise<void>;
  // Retorna todos os IDs do lado `side` que possuem pelo menos um vinculo
  // nesta relationship. Usado pelo filtro excludeLinked no autocomplete 1:1.
  abstract findAllLinkedIds(
    relationshipId: string,
    side: RelationshipLinkSide,
  ): Promise<string[]>;
}
