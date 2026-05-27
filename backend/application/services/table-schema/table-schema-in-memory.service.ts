import type {
  IField,
  IGroupConfiguration,
  ITable,
  ITableSchema,
} from '@application/core/entity.core';

import { TableSchemaContractService } from './table-schema-contract.service';

export default class TableSchemaInMemoryService extends TableSchemaContractService {
  private _forcedErrors = new Map<string, Error>();
  syncModelCallCount = 0;

  simulateError(method: string, error: Error): void {
    this._forcedErrors.set(method, error);
  }

  computeSchema(
    _fields: IField[],
    _groups?: IGroupConfiguration[],
  ): ITableSchema {
    const err = this._forcedErrors.get('computeSchema');
    if (err) {
      this._forcedErrors.delete('computeSchema');
      throw err;
    }
    return {};
  }

  async syncModel(_table: ITable): Promise<void> {
    const err = this._forcedErrors.get('syncModel');
    if (err) {
      this._forcedErrors.delete('syncModel');
      throw err;
    }
    this.syncModelCallCount++;
  }
}
