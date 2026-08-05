import mongoose from 'mongoose';

import {
  E_USER_STATUS,
  Merge,
  type IUser as Core,
} from '@application/core/entity.core';

type Entity = Merge<Omit<Core, '_id'>, mongoose.Document>;

export const Schema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },

    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(E_USER_STATUS),
      default: E_USER_STATUS.INACTIVE,
    },
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'UserGroup' },
    // Grupos adicionais (multi-grupo). O acesso efetivo e o fecho de
    // `{group} ∪ groups`. Default [] mantem usuarios atuais inalterados.
    groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserGroup' }],

    notificationsEnabled: { type: Boolean, default: true },

    // Geracao da sessao: incrementar invalida os JWT ja emitidos.
    sessionVersion: { type: Number, default: 0 },

    trashed: { type: Boolean, default: false },
    trashedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    id: false,
  },
);

export const User: mongoose.Model<Entity> =
  mongoose?.models?.User || mongoose.model<Entity>('User', Schema, 'users');
