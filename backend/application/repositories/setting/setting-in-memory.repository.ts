import type { ISetting } from '@application/core/entity.core';
import { InMemoryRepository } from '@application/repositories/in-memory-base.repository';

import { EntityFixtures } from '../entity-fixtures';

import type {
  SettingContractRepository,
  SettingUpdatePayload,
} from './setting-contract.repository';

const fixtures = new EntityFixtures();

export default class SettingInMemoryRepository
  extends InMemoryRepository
  implements SettingContractRepository
{
  private item: ISetting | null = null;

  async get(): Promise<ISetting | null> {
    this.checkError('get');
    return this.item;
  }

  async update(payload: SettingUpdatePayload): Promise<ISetting> {
    this.checkError('update');
    if (!this.item) {
      // ISetting completo via fixture; o payload (incl. MODEL_CLONE_TABLES como
      // string[]) sobrescreve — sem asserção, já que ISetting.MODEL_CLONE_TABLES
      // aceita `string | ITable`.
      this.item = { ...fixtures.makeSetting(), ...payload };
    } else {
      Object.assign(this.item, payload);
    }
    return this.item;
  }
}
