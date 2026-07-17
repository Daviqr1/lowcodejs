import { Service } from 'fastify-decorators';

import type { ISetting } from '@application/core/entity.core';
import { Setting as Model } from '@application/model/setting.model';

import type {
  SettingContractRepository,
  SettingUpdatePayload,
} from './setting-contract.repository';

@Service()
export default class SettingMongooseRepository implements SettingContractRepository {
  private transform(entity: InstanceType<typeof Model>): ISetting {
    return entity.toJSON({ flattenObjectIds: true });
  }

  async get(): Promise<ISetting | null> {
    const setting = await Model.findOne().populate('MODEL_CLONE_TABLES');

    if (!setting) return null;

    return this.transform(setting);
  }

  async update(payload: SettingUpdatePayload): Promise<ISetting> {
    const setting = await Model.findOneAndUpdate({}, payload, {
      new: true,
      upsert: true,
    }).populate('MODEL_CLONE_TABLES');

    return this.transform(setting);
  }
}
