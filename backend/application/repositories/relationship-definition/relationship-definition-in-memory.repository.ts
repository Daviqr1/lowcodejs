import type {
  FindOptions,
  IRelationshipDefinition,
} from '@application/core/entity.core';
import { InMemoryCollectionRepository } from '@application/repositories/in-memory-base.repository';

import type {
  RelationshipDefinitionContractRepository,
  RelationshipDefinitionCreatePayload,
  RelationshipDefinitionUpdatePayload,
} from './relationship-definition-contract.repository';

export default class RelationshipDefinitionInMemoryRepository
  extends InMemoryCollectionRepository<IRelationshipDefinition>
  implements RelationshipDefinitionContractRepository
{
  async create(
    payload: RelationshipDefinitionCreatePayload,
  ): Promise<IRelationshipDefinition> {
    const definition: IRelationshipDefinition = {
      _id: crypto.randomUUID(),
      name: payload.name,
      source: payload.source,
      target: payload.target,
      onDelete: payload.onDelete,
      createdAt: new Date(),
      updatedAt: new Date(),
      trashed: false,
      trashedAt: null,
    };
    this.items.push(definition);
    return definition;
  }

  async findById(
    _id: string,
    options?: FindOptions,
  ): Promise<IRelationshipDefinition | null> {
    const definition = this.items.find((item) => {
      if (item._id !== _id) return false;
      if (options?.trashed !== undefined)
        return item.trashed === options.trashed;
      return !item.trashed;
    });
    return definition ?? null;
  }

  async findByTable(tableId: string): Promise<IRelationshipDefinition[]> {
    return this.items.filter(
      (item) =>
        !item.trashed &&
        (item.source.table._id === tableId ||
          item.target.table._id === tableId),
    );
  }

  async findBySourceField(
    fieldId: string,
  ): Promise<IRelationshipDefinition | null> {
    const definition = this.items.find(
      (item) => !item.trashed && item.source.field._id === fieldId,
    );
    return definition ?? null;
  }

  async findMany(options?: FindOptions): Promise<IRelationshipDefinition[]> {
    return this.items.filter((item) => {
      if (options?.trashed !== undefined)
        return item.trashed === options.trashed;
      return !item.trashed;
    });
  }

  async update(
    payload: RelationshipDefinitionUpdatePayload,
  ): Promise<IRelationshipDefinition> {
    const definition = this.items.find((item) => item._id === payload._id);
    if (!definition) throw new Error('RelationshipDefinition not found');

    if (payload.name !== undefined) definition.name = payload.name;
    if (payload.source !== undefined) definition.source = payload.source;
    if (payload.target !== undefined) definition.target = payload.target;
    if (payload.onDelete !== undefined) definition.onDelete = payload.onDelete;
    definition.updatedAt = new Date();
    return definition;
  }

  async delete(_id: string): Promise<void> {
    const definition = this.items.find((item) => item._id === _id);
    if (definition) {
      definition.trashed = true;
      definition.trashedAt = new Date();
    }
  }
}
