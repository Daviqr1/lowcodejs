import mongoose from 'mongoose';

import type { ITable, Optional } from '@application/core/entity.core';

import { ModelBuilderContractService } from './model-builder-contract.service';
import type { Entity } from './model-builder.service';

type TableInput = Optional<
  ITable,
  '_id' | 'createdAt' | 'updatedAt' | 'trashed' | 'trashedAt'
>;

export default class InMemoryModelBuilder implements ModelBuilderContractService {
  // conexão desconectada: compila models sem tocar em banco (uso só em testes)
  private readonly connection = mongoose.createConnection();
  private _forcedErrors = new Map<string, Error>();

  buildCallCount = 0;

  simulateError(method: string, error: Error): void {
    this._forcedErrors.set(method, error);
  }

  async build(table: TableInput): Promise<mongoose.Model<Entity>> {
    const err = this._forcedErrors.get('build');
    if (err) {
      this._forcedErrors.delete('build');
      throw err;
    }

    this.buildCallCount++;

    const name = `inmem_${this.buildCallCount}_${table.slug ?? 'table'}`;
    const schema = new mongoose.Schema({});
    return this.connection.model<Entity>(name, schema);
  }
}
