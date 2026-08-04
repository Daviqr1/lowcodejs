import mongoose from 'mongoose';

import {
  E_STORAGE_LOCATION,
  E_STORAGE_MIGRATION_STATUS,
  type IStorage as Core,
  type Merge,
  type TStorageLocation,
} from '@application/core/entity.core';
import SlugService from '@application/services/slug/slug.service';
import StorageConfigService from '@application/services/storage-config/storage-config.service';
import { Env } from '@start/env';

// Default de schema Mongoose: avaliado no import do model, antes de o
// container existir. O StorageConfigService so le `process.env`.
const storageConfig = new StorageConfigService(new SlugService());

type Entity = Merge<Omit<Core, '_id'>, mongoose.Document>;

export const Schema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    filename: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    originalName: { type: String, required: true },

    location: {
      type: String,
      enum: Object.values(E_STORAGE_LOCATION),
      required: true,
      default: (): TStorageLocation => storageConfig.driver(),
    },
    migration_status: {
      type: String,
      enum: Object.values(E_STORAGE_MIGRATION_STATUS),
      required: true,
      default: E_STORAGE_MIGRATION_STATUS.IDLE,
    },

    trashed: { type: Boolean, default: false },
    trashedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

Schema.virtual('url').get(function () {
  return Env.APP_SERVER_URL.concat('/storage/').concat(this.filename);
});

export const Storage: mongoose.Model<Entity> =
  mongoose?.models?.Storage ||
  mongoose.model<Entity>('Storage', Schema, 'storage');
