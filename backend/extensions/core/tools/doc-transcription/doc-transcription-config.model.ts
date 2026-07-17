import mongoose from 'mongoose';

import type { Merge } from '@application/core/entity.core';

import type { IDocTranscriptionConfig } from './doc-transcription.types';

const SINGLETON_ID = 'singleton';

const ResponseFieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: {
      type: String,
      enum: ['string', 'date', 'number', 'boolean'],
      default: 'string',
    },
  },
  { _id: false },
);

const DocumentTypeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: null },
    responseFields: { type: [ResponseFieldSchema], default: [] },
  },
  { _id: false },
);

const DocTranscriptionConfigSchema = new mongoose.Schema(
  {
    _id: { type: String, default: SINGLETON_ID },
    apiUrl: { type: String, default: null },
    apiKey: { type: String, default: null },
    model: { type: String, default: null },
    documentTypes: { type: [DocumentTypeSchema], default: [] },
  },
  { timestamps: true, id: false },
);

export const DocTranscriptionConfigModel: mongoose.Model<
  Merge<IDocTranscriptionConfig, mongoose.Document>
> =
  mongoose?.models?.DocTranscriptionConfig ||
  mongoose.model<Merge<IDocTranscriptionConfig, mongoose.Document>>(
    'DocTranscriptionConfig',
    DocTranscriptionConfigSchema,
    'doc_transcription_config',
  );

export async function getOrCreateConfig(): Promise<IDocTranscriptionConfig> {
  let doc = await DocTranscriptionConfigModel.findById(SINGLETON_ID);
  if (!doc) {
    doc = await DocTranscriptionConfigModel.create({
      _id: SINGLETON_ID,
      apiUrl: null,
      documentTypes: [],
    });
  }
  return doc.toJSON();
}

export async function saveConfig(
  data: Partial<IDocTranscriptionConfig>,
): Promise<IDocTranscriptionConfig> {
  const doc = await DocTranscriptionConfigModel.findByIdAndUpdate(
    SINGLETON_ID,
    { $set: data },
    { upsert: true, new: true },
  );
  return doc!.toJSON();
}
