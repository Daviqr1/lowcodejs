import type { ISetting } from '@application/core/entity.core';

import { makeSetting } from '../entity-fixtures';

import type {
  SettingContractRepository,
  SettingUpdatePayload,
} from './setting-contract.repository';

export default class SettingInMemoryRepository implements SettingContractRepository {
  private item: ISetting | null = null;
  private _forcedErrors = new Map<string, Error>();

  simulateError(method: string, error: Error): void {
    this._forcedErrors.set(method, error);
  }

  private _checkError(method: string): void {
    const err = this._forcedErrors.get(method);
    if (err) {
      this._forcedErrors.delete(method);
      throw err;
    }
  }

  async get(): Promise<ISetting | null> {
    this._checkError('get');
    return this.item;
  }

  async update(payload: SettingUpdatePayload): Promise<ISetting> {
    this._checkError('update');
    if (!this.item) {
      // ISetting completo via fixture; o payload (incl. MODEL_CLONE_TABLES como
      // string[]) sobrescreve — sem asserção, já que ISetting.MODEL_CLONE_TABLES
      // aceita `string | ITable`.
      this.item = { ...makeSetting(), ...payload };
    } else {
      Object.assign(this.item, payload);
    }
    return this.item;
  }
}
