import { Service } from 'fastify-decorators';

import { ConditionalFieldsConfigContractRepository } from './conditional-fields-config-contract.repository';
import { ConditionalFieldsConfigModel } from './conditional-fields-config.model';
import type { ConditionalFieldsConfig } from './conditional-fields.types';

@Service()
export default class ConditionalFieldsConfigMongooseRepository implements ConditionalFieldsConfigContractRepository {
  async findByTable(
    tableId: string,
    tableSlug: string,
  ): Promise<ConditionalFieldsConfig> {
    const doc = await ConditionalFieldsConfigModel.findOne({ tableId }).lean();
    if (doc) return doc;
    return { tableId, tableSlug, rules: [] };
  }

  async save(
    config: ConditionalFieldsConfig,
  ): Promise<ConditionalFieldsConfig> {
    return ConditionalFieldsConfigModel.findOneAndUpdate(
      { tableId: config.tableId },
      { $set: { tableSlug: config.tableSlug, rules: config.rules } },
      { upsert: true, new: true },
    ).lean();
  }
}
