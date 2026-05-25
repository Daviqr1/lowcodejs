import type { IField } from '@application/core/entity.core';

import { RowPasswordContractService } from './row-password-contract.service';

export default class InMemoryRowPasswordService extends RowPasswordContractService {
  private _forcedErrors = new Map<string, Error>();

  simulateError(method: string, error: Error): void {
    this._forcedErrors.set(method, error);
  }

  async hash(_payload: Record<string, any>, _fields: IField[]): Promise<void> {
    const err = this._forcedErrors.get('hash');
    if (err) {
      this._forcedErrors.delete('hash');
      throw err;
    }
  }

  mask(_row: Record<string, any>, _fields: IField[]): void {
    const err = this._forcedErrors.get('mask');
    if (err) {
      this._forcedErrors.delete('mask');
      throw err;
    }
  }

  stripMasked(_payload: Record<string, any>, _fields: IField[]): void {
    const err = this._forcedErrors.get('stripMasked');
    if (err) {
      this._forcedErrors.delete('stripMasked');
      throw err;
    }
  }
}
