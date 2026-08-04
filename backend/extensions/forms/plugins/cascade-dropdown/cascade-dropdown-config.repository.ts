import { Service } from 'fastify-decorators';
import mongoose from 'mongoose';

import { CascadeDropdownConfigContractRepository } from './cascade-dropdown-config-contract.repository';
import { CascadeDropdownConfigModel } from './cascade-dropdown-config.model';
import type { CascadeDropdownConfig } from './cascade-dropdown.types';

@Service()
export default class CascadeDropdownConfigMongooseRepository implements CascadeDropdownConfigContractRepository {
  async findByTarget(
    targetTableSlug: string,
    targetFieldId: string,
  ): Promise<CascadeDropdownConfig | null> {
    const doc = await CascadeDropdownConfigModel.findOne({
      targetTableSlug,
      targetFieldId,
    });

    if (!doc) return null;
    return doc.toJSON();
  }

  async save(data: CascadeDropdownConfig): Promise<CascadeDropdownConfig> {
    const doc = await CascadeDropdownConfigModel.findOneAndUpdate(
      {
        targetTableSlug: data.targetTableSlug,
        targetFieldId: data.targetFieldId,
      },
      { $set: data },
      { upsert: true, new: true },
    );

    return doc!.toJSON();
  }

  async deleteForField(params: {
    tableSlug: string;
    fieldId: string;
    fieldSlug?: string;
  }): Promise<number> {
    const fieldRefs: Array<Record<string, unknown>> = [
      { targetTableSlug: params.tableSlug, targetFieldId: params.fieldId },
      { targetTableSlug: params.tableSlug, parentFieldId: params.fieldId },
      { sourceTableSlug: params.tableSlug, childFieldId: params.fieldId },
      {
        sourceTableSlug: params.tableSlug,
        filters: { $elemMatch: { fieldId: params.fieldId } },
      },
    ];

    if (params.fieldSlug) {
      fieldRefs.push(
        {
          targetTableSlug: params.tableSlug,
          targetFieldSlug: params.fieldSlug,
        },
        {
          targetTableSlug: params.tableSlug,
          parentFieldSlug: params.fieldSlug,
        },
        { sourceTableSlug: params.tableSlug, childFieldSlug: params.fieldSlug },
        {
          sourceTableSlug: params.tableSlug,
          filters: { $elemMatch: { fieldSlug: params.fieldSlug } },
        },
      );
    }

    // Sem conexao Mongo (ex.: testes unitarios com repos in-memory), o mongoose
    // bufferiza o comando e trava ate o timeout. Curto-circuita como no-op.
    if (mongoose.connection.readyState !== 1) return 0;

    const result = await CascadeDropdownConfigModel.deleteMany({
      $or: fieldRefs,
    });

    return result.deletedCount ?? 0;
  }
}
