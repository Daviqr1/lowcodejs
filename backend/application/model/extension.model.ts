import mongoose from 'mongoose';

import {
  E_EXTENSION_TYPE,
  Merge,
  type IExtension as Core,
} from '@application/core/entity.core';

type Entity = Merge<Omit<Core, '_id'>, mongoose.Document>;

export const Schema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },

    pkg: { type: String, required: true },
    type: {
      type: String,
      enum: Object.values(E_EXTENSION_TYPE),
      required: true,
    },
    extensionId: { type: String, required: true },

    name: { type: String, required: true },
    description: { type: String, default: null },
    version: { type: String, required: true },
    author: { type: String, default: null },
    icon: { type: String, default: null },
    image: { type: String, default: null },

    slots: { type: [String], default: [] },
    route: { type: String, default: null },
    configRoute: { type: String, default: null },
    submenu: { type: String, default: null },

    enabled: { type: Boolean, default: false },
    available: { type: Boolean, default: true },

    tableScope: {
      mode: {
        type: String,
        enum: ['all', 'specific'],
        default: 'all',
      },
      tableIds: { type: [String], default: [] },
    },

    /**
     * Configurações por tabela. Mapa tableId -> settings (Record<string, unknown>).
     * Populado por configure-table-scope e lido por RowAccessGuardService.
     */
    tableSettings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    manifestSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    requires: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    permissions: {
      view: { type: [String], default: [] },
    },

    trashed: { type: Boolean, default: false },
    trashedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    id: false,
  },
);

Schema.index({ pkg: 1, type: 1, extensionId: 1 }, { unique: true });
Schema.index({ enabled: 1, type: 1 });
Schema.index({ slots: 1, enabled: 1 });

export const Extension: mongoose.Model<Entity> =
  mongoose?.models?.Extension ||
  mongoose.model<Entity>('Extension', Schema, 'extensions');
