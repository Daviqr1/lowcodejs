import type { IField } from '@application/core/entity.core';

import { RowContextBuilderContractService } from './row-context-builder-contract.service';

export default class InMemoryRowContextBuilder implements RowContextBuilderContractService {
  private _forcedErrors = new Map<string, Error>();

  simulateError(method: string, error: Error): void {
    this._forcedErrors.set(method, error);
  }

  transform<T extends Record<string, unknown>>(
    rowJson: T,
    _fields: IField[],
    _userId?: string,
  ): T {
    const err = this._forcedErrors.get('transform');
    if (err) {
      this._forcedErrors.delete('transform');
      throw err;
    }
    return rowJson;
  }
}
