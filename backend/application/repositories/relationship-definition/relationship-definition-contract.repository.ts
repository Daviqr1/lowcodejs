/* eslint-disable no-unused-vars */
import type {
  E_RELATIONSHIP_ON_DELETE,
  FindOptions,
  IRelationshipDefinition,
  IRelationshipEndpoint,
  ValueOf,
} from '@application/core/entity.core';

export type RelationshipDefinitionCreatePayload = {
  name: string;
  source: IRelationshipEndpoint;
  target: IRelationshipEndpoint;
  onDelete: ValueOf<typeof E_RELATIONSHIP_ON_DELETE>;
};

export type RelationshipDefinitionUpdatePayload = {
  _id: string;
  name?: string;
  source?: IRelationshipEndpoint;
  target?: IRelationshipEndpoint;
  onDelete?: ValueOf<typeof E_RELATIONSHIP_ON_DELETE>;
};

export abstract class RelationshipDefinitionContractRepository {
  abstract create(
    payload: RelationshipDefinitionCreatePayload,
  ): Promise<IRelationshipDefinition>;
  abstract findById(
    _id: string,
    options?: FindOptions,
  ): Promise<IRelationshipDefinition | null>;
  // Definicoes que tocam uma tabela em qualquer lado (source ou target).
  abstract findByTable(tableId: string): Promise<IRelationshipDefinition[]>;
  // Definicao nao-trashed cujo lado source e o campo informado. Um campo source
  // deve ter no maximo UMA definition — usado como guarda de dedup na
  // materializacao (evita duplicar def/espelho ao re-materializar).
  abstract findBySourceField(
    fieldId: string,
  ): Promise<IRelationshipDefinition | null>;
  abstract findMany(options?: FindOptions): Promise<IRelationshipDefinition[]>;
  abstract update(
    payload: RelationshipDefinitionUpdatePayload,
  ): Promise<IRelationshipDefinition>;
  // Soft delete (trashed = true, trashedAt = agora).
  abstract delete(_id: string): Promise<void>;
}
