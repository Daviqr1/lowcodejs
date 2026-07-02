import mongoose from 'mongoose';

import {
  E_NOTIFICATION_TYPE,
  Merge,
  type INotification as Core,
} from '@application/core/entity.core';

type Entity = Merge<Omit<Core, '_id'>, mongoose.Document>;

export const Schema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(E_NOTIFICATION_TYPE),
      default: E_NOTIFICATION_TYPE.GENERIC,
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, default: null },

    action: {
      type: new mongoose.Schema(
        {
          type: { type: String, enum: ['route', 'url'], required: true },
          href: { type: String, required: true },
          label: { type: String, default: null },
        },
        { _id: false },
      ),
      default: null,
    },

    source: {
      type: new mongoose.Schema(
        {
          pkg: { type: String, default: null },
          tableSlug: { type: String, default: null },
          rowId: { type: String, default: null },
          anchorId: { type: String, default: null },
        },
        { _id: false },
      ),
      default: null,
    },

    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },

    trashed: { type: Boolean, default: false },
    trashedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    id: false,
  },
);

Schema.index({ userId: 1, read: 1, createdAt: -1 });
Schema.index({ userId: 1, trashed: 1, createdAt: -1 });

export const Notification: mongoose.Model<Entity> =
  mongoose?.models?.Notification ||
  mongoose.model<Entity>('Notification', Schema, 'notifications');
