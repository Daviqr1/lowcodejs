import mongoose from 'mongoose';

import type { ISetting as Core, Merge } from '@application/core/entity.core';

type Entity = Merge<Omit<Core, '_id'>, mongoose.Document>;

const Schema = new mongoose.Schema(
  {
    SYSTEM_NAME: { type: String, default: 'LowCodeJs' },
    SYSTEM_DESCRIPTION: { type: String, default: 'Plataforma Oficial' },
    LOCALE: { type: String, default: 'pt-br' },
    STORAGE_DRIVER: { type: String, default: 'local', enum: ['local', 's3'] },
    STORAGE_ENDPOINT: { type: String },
    STORAGE_REGION: { type: String, default: 'us-east-1' },
    STORAGE_BUCKET: { type: String },
    STORAGE_ACCESS_KEY: { type: String },
    STORAGE_SECRET_KEY: { type: String },
    FILE_UPLOAD_MAX_SIZE: { type: Number, default: 10485760 },
    FILE_UPLOAD_ACCEPTED: { type: String, default: 'jpg;jpeg;png;pdf' },
    FILE_UPLOAD_MAX_FILES_PER_UPLOAD: { type: Number, default: 10 },
    PAGINATION_PER_PAGE: { type: Number, default: 20 },
    MODEL_CLONE_TABLES: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
    ],
    LOGO_SMALL_URL: { type: String, default: null },
    LOGO_LARGE_URL: { type: String, default: null },
    LOGO_SMALL_DARK_URL: { type: String, default: null },
    LOGO_LARGE_DARK_URL: { type: String, default: null },
    LOGIN_BACKGROUND_URL: { type: String, default: null },
    EMAIL_PROVIDER_HOST: { type: String, default: null },
    EMAIL_PROVIDER_PORT: { type: Number, default: null },
    EMAIL_PROVIDER_USER: { type: String, default: null },
    EMAIL_PROVIDER_PASSWORD: { type: String, default: null },
    EMAIL_PROVIDER_FROM: { type: String, default: null },
    OPENAI_API_KEY: { type: String, default: null },
    AI_ASSISTANT_ENABLED: { type: Boolean, default: false },
    CHAT_HISTORY_ENABLED: { type: Boolean, default: false },
    MCP_SERVER_URL: { type: String, default: null },
    MCP_SERVER_TOKEN: { type: String, default: null },
    MCP_LOWCODE_API_URL: { type: String, default: null },
    OPENAI_MODEL: { type: String, default: 'gpt-4.1-nano' },
    AI_LLM_PROVIDER: {
      type: String,
      enum: ['openai', 'gemini', 'claude', 'openrouter', 'ollama'],
      default: 'openai',
    },
    LLM_API_KEY: { type: String, default: null },
    LLM_MODEL: { type: String, default: null },
    LLM_BASE_URL: { type: String, default: null },
    SETUP_COMPLETED: { type: Boolean, default: false },
    SETUP_CURRENT_STEP: {
      type: String,
      enum: [
        'admin',
        'name',
        'storage',
        'logos',
        'upload',
        'paging',
        'email',
        null,
      ],
      default: 'admin',
    },
    MIGRATION_DUAL_CONNECTION_AT: { type: Date, default: null },
    MIGRATION_DUAL_CONNECTION_DROPPED_AT: { type: Date, default: null },
    MIGRATION_STORAGE_LOCATION_AT: { type: Date, default: null },
    STORAGE_MIGRATION_LAST_RUN_AT: { type: Date, default: null },
    MIGRATION_RELATIONSHIP_LIFT_OUT_AT: { type: Date, default: null },
    MIGRATION_RELATIONSHIP_EMBEDDED_TO_LINKS_AT: { type: Date, default: null },
    MIGRATION_RELATIONSHIP_ENDPOINT_FLAGS_AT: { type: Date, default: null },
    trashed: { type: Boolean, default: false },
    trashedAt: { type: Date, default: null },
  },
  { timestamps: true, id: false },
);

export const Setting: mongoose.Model<Entity> =
  mongoose?.models?.Setting ||
  mongoose.model<Entity>('Setting', Schema, 'settings');
