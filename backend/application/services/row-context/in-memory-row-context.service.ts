import type { IField, IRow } from '@application/core/entity.core';

import { RowContextContractService } from './row-context-contract.service';

export default class InMemoryRowContextService extends RowContextContractService {
  private _forcedErrors = new Map<string, Error>();

  simulateError(method: string, error: Error): void {
    this._forcedErrors.set(method, error);
  }

  transform(row: IRow, _fields: IField[], _userId?: string): IRow {
    const err = this._forcedErrors.get('transform');
    if (err) {
      this._forcedErrors.delete('transform');
      throw err;
    }
    return row;
  }
}
