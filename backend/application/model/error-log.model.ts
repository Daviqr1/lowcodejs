import mongoose from 'mongoose';

import { Merge } from '@application/core/entity.core';
import type { IErrorLog as Core } from '@application/repositories/error-log/error-log-contract.repository';

type Entity = Merge<Omit<Core, '_id'>, mongoose.Document>;

const Schema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    // Status HTTP do erro (capturado pelo hook quando a resposta sai >= 500).
    statusCode: { type: Number, required: true },
    message: { type: String, required: true },
    cause: { type: String, default: null },
    method: { type: String, required: true },
    url: { type: String, required: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
    },
    // Erros por campo (quando houver), capturados do corpo da resposta.
    errors: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
      default: null,
    },
    // Fluxo de tratamento: quando resolvido, sai da lista "em aberto".
    resolved: { type: Boolean, required: true, default: false },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

Schema.index({ createdAt: -1 });
Schema.index({ statusCode: 1, createdAt: -1 });
Schema.index({ resolved: 1, createdAt: -1 });

export const ErrorLog = (mongoose?.models?.ErrorLog ||
  mongoose.model<Entity>(
    'ErrorLog',
    Schema,
    'error_logs',
  )) as mongoose.Model<Entity>;
