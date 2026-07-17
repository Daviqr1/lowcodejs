import mongoose from 'mongoose';

import type { IGroup as Core, Merge } from '@application/core/entity.core';

type Entity = Merge<Omit<Core, '_id'>, mongoose.Document>;

export const Schema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String },
    permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],
    // Grupos englobados (multi-link). Quem pertence a este grupo herda o acesso
    // liberado a eles. Default [] preserva grupos existentes sem hierarquia.
    encompasses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserGroup' }],

    trashed: { type: Boolean, default: false },
    trashedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    id: false,
  },
);

export const UserGroup: mongoose.Model<Entity> =
  mongoose?.models?.UserGroup ||
  mongoose.model<Entity>('UserGroup', Schema, 'user-groups');
