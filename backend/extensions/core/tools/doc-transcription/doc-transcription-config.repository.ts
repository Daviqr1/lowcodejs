import { Service } from 'fastify-decorators';

import { DocTranscriptionConfigContractRepository } from './doc-transcription-config-contract.repository';
import {
  DOC_TRANSCRIPTION_CONFIG_ID,
  DocTranscriptionConfigModel,
} from './doc-transcription-config.model';
import type { IDocTranscriptionConfig } from './doc-transcription.types';

@Service()
export default class DocTranscriptionConfigMongooseRepository implements DocTranscriptionConfigContractRepository {
  async getOrCreate(): Promise<IDocTranscriptionConfig> {
    const existing = await DocTranscriptionConfigModel.findById(
      DOC_TRANSCRIPTION_CONFIG_ID,
    );
    if (existing) return existing.toJSON();

    const created = await DocTranscriptionConfigModel.create({
      _id: DOC_TRANSCRIPTION_CONFIG_ID,
      apiUrl: null,
      documentTypes: [],
    });
    return created.toJSON();
  }

  async save(
    data: Partial<IDocTranscriptionConfig>,
  ): Promise<IDocTranscriptionConfig> {
    const doc = await DocTranscriptionConfigModel.findByIdAndUpdate(
      DOC_TRANSCRIPTION_CONFIG_ID,
      { $set: data },
      { upsert: true, new: true },
    );
    return doc!.toJSON();
  }
}
