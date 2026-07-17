import mongoose from 'mongoose';

import {
  E_REACTION_TYPE,
  Merge,
  type IReaction as Core,
} from '@application/core/entity.core';

type Entity = Merge<Omit<Core, '_id'>, mongoose.Document>;

export const Schema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },

    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      enum: Object.values(E_REACTION_TYPE),
      default: E_REACTION_TYPE.LIKE,
      required: true,
    },

    trashed: { type: Boolean, default: false },
    trashedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    id: false,
  },
);

export const Reaction: mongoose.Model<Entity> =
  mongoose?.models?.Reaction ||
  mongoose.model<Entity>('Reaction', Schema, 'reactions');
