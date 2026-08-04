import mongoose from 'mongoose';

import type { Merge } from '@application/core/entity.core';

import type { CascadeDropdownConfig } from './cascade-dropdown.types';

const FilterSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    fieldId: { type: String, required: true },
    fieldSlug: { type: String, required: true },
    fieldType: { type: String, required: true },
    operator: {
      type: String,
      enum: [
        'equals',
        'not_equals',
        'contains',
        'is_empty',
        'is_not_empty',
        'date_between',
      ],
      required: true,
    },
    value: { type: String, default: null },
    values: { type: [String], default: [] },
    dateStart: { type: String, default: null },
    dateEnd: { type: String, default: null },
  },
  { _id: false },
);

const CascadeDropdownConfigSchema = new mongoose.Schema(
  {
    targetTableSlug: { type: String, required: true },
    targetFieldId: { type: String, required: true },
    targetFieldSlug: { type: String, required: true },
    sourceTableId: { type: String, required: true },
    sourceTableSlug: { type: String, required: true },
    parentFieldId: { type: String, required: true },
    parentFieldSlug: { type: String, required: true },
    childFieldId: { type: String, required: true },
    childFieldSlug: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    parentWidth: { type: Number, default: 30 },
    childWidth: { type: Number, default: 70 },
    filters: { type: [FilterSchema], default: [] },
  },
  { timestamps: true, id: false },
);

CascadeDropdownConfigSchema.index(
  { targetTableSlug: 1, targetFieldId: 1 },
  { unique: true },
);

export const CascadeDropdownConfigModel: mongoose.Model<
  Merge<CascadeDropdownConfig, mongoose.Document>
> =
  mongoose.models.CascadeDropdownConfig ||
  mongoose.model<Merge<CascadeDropdownConfig, mongoose.Document>>(
    'CascadeDropdownConfig',
    CascadeDropdownConfigSchema,
    'cascade_dropdown_field_configs',
  );
