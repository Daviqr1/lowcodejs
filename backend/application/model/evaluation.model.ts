import mongoose from 'mongoose';

import type { IEvaluation as Core, Merge } from '@application/core/entity.core';

type Entity = Merge<Omit<Core, '_id'>, mongoose.Document>;

export const Schema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },

    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    value: { type: Number, default: 0 },

    trashed: { type: Boolean, default: false },
    trashedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    id: false,
  },
);

export const Evaluation: mongoose.Model<Entity> =
  mongoose?.models?.Evaluation ||
  mongoose.model<Entity>('Evaluation', Schema, 'evaluations');
