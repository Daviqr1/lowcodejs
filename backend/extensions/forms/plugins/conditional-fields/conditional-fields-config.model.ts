import mongoose from 'mongoose';

import type { Merge } from '@application/core/entity.core';

import type { ConditionalFieldsConfig } from './conditional-fields.types';

const ConditionalFieldRuleSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: false },
    sourceFieldId: { type: String, required: true },
    sourceFieldSlug: { type: String, required: true },
    sourceValue: { type: String, required: true },
    showFieldIds: { type: [String], default: [] },
    hideFieldIds: { type: [String], default: [] },
  },
  { _id: false },
);

const ConditionalFieldsConfigSchema = new mongoose.Schema(
  {
    tableId: { type: String, required: true, unique: true, index: true },
    tableSlug: { type: String, required: true, index: true },
    rules: { type: [ConditionalFieldRuleSchema], default: [] },
  },
  { timestamps: true, id: false },
);

export const ConditionalFieldsConfigModel: mongoose.Model<
  Merge<ConditionalFieldsConfig, mongoose.Document>
> =
  mongoose?.models?.ConditionalFieldsConfig ||
  mongoose.model<Merge<ConditionalFieldsConfig, mongoose.Document>>(
    'ConditionalFieldsConfig',
    ConditionalFieldsConfigSchema,
    'conditional_fields_configs',
  );
