import { Service } from 'fastify-decorators';

import type {
  FindOptions,
  IRelationshipDefinition,
} from '@application/core/entity.core';
import { RelationshipDefinition as Model } from '@application/model/relationship-definition.model';
import { MongooseRepository } from '@application/repositories/mongoose-base.repository';

import type {
  RelationshipDefinitionContractRepository,
  RelationshipDefinitionCreatePayload,
  RelationshipDefinitionUpdatePayload,
} from './relationship-definition-contract.repository';

@Service()
export default class RelationshipDefinitionMongooseRepository
  extends MongooseRepository<IRelationshipDefinition>
  implements RelationshipDefinitionContractRepository
{
  async create(
    payload: RelationshipDefinitionCreatePayload,
  ): Promise<IRelationshipDefinition> {
    const created = await Model.create(payload);
    return this.transform(created);
  }

  async findById(
    _id: string,
    options?: FindOptions,
  ): Promise<IRelationshipDefinition | null> {
    const where = this.trashedClause({ _id }, options, { $ne: true });

    const definition = await Model.findOne(where);
    if (!definition) return null;
    return this.transform(definition);
  }

  async findByTable(tableId: string): Promise<IRelationshipDefinition[]> {
    const definitions = await Model.find({
      trashed: { $ne: true },
      $or: [{ 'source.table._id': tableId }, { 'target.table._id': tableId }],
    });
    return definitions.map((definition) => this.transform(definition));
  }

  async findBySourceField(
    fieldId: string,
  ): Promise<IRelationshipDefinition | null> {
    const definition = await Model.findOne({
      trashed: { $ne: true },
      'source.field._id': fieldId,
    });
    if (!definition) return null;
    return this.transform(definition);
  }

  async findMany(options?: FindOptions): Promise<IRelationshipDefinition[]> {
    const where = this.trashedClause({}, options, { $ne: true });

    const definitions = await Model.find(where).sort({ createdAt: 'desc' });
    return definitions.map((definition) => this.transform(definition));
  }

  async update(
    payload: RelationshipDefinitionUpdatePayload,
  ): Promise<IRelationshipDefinition> {
    const { _id, ...rest } = payload;
    const definition = await Model.findById(_id);
    if (!definition) throw new Error('RelationshipDefinition not found');

    definition.set(rest);
    await definition.save();
    return this.transform(definition);
  }

  async delete(_id: string): Promise<void> {
    await Model.updateOne(
      { _id },
      { $set: { trashed: true, trashedAt: new Date() } },
    );
  }
}
