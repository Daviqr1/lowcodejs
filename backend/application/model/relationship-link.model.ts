import mongoose from 'mongoose';

import {
  Merge,
  type IRelationshipLink as Core,
} from '@application/core/entity.core';

type Entity = Merge<Omit<Core, '_id'>, mongoose.Document>;

export const Schema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    relationshipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RelationshipDefinition',
      required: true,
    },
    sourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    order: { type: Number, default: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  {
    timestamps: true,
    id: false,
  },
);

// Idempotencia do vinculo sob concorrencia: um par (relationshipId, source,
// target) e unico.
Schema.index({ relationshipId: 1, sourceId: 1, targetId: 1 }, { unique: true });
// Listar/ordenar pelo lado source e pelo lado target.
Schema.index({ relationshipId: 1, sourceId: 1, order: 1 });
Schema.index({ relationshipId: 1, targetId: 1, order: 1 });

export const RelationshipLink: mongoose.Model<Entity> =
  mongoose?.models?.RelationshipLink ||
  mongoose.model<Entity>('RelationshipLink', Schema, 'relationship-links');
