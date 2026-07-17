import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';

import { saveConfig } from './doc-transcription-config.model';
import type { IDocTranscriptionConfig } from './doc-transcription.types';
import type { UpdateConfigInput } from './doc-transcription.validator';

type Response = Either<HTTPException, IDocTranscriptionConfig>;

@Service()
export default class UpdateDocTranscriptionConfigUseCase {
  async execute(input: UpdateConfigInput): Promise<Response> {
    try {
      const ids = (input.documentTypes ?? []).map((dt) => dt.id);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        return left(
          HTTPException.BadRequest(
            'IDs de tipos de documento devem ser únicos',
            'DUPLICATE_DOCUMENT_TYPE_ID',
          ),
        );
      }

      const config = await saveConfig({
        ...(input.apiUrl !== undefined && { apiUrl: input.apiUrl }),
        ...(input.apiKey !== undefined &&
          input.apiKey !== null &&
          input.apiKey.trim() !== '' && { apiKey: input.apiKey.trim() }),
        ...(input.model !== undefined &&
          input.model !== null &&
          input.model.trim() !== '' && { model: input.model.trim() }),
        ...(input.documentTypes !== undefined && {
          documentTypes: input.documentTypes.map((dt) => ({
            id: dt.id,
            name: dt.name,
            description: dt.description ?? null,
            responseFields: dt.responseFields,
          })),
        }),
      });

      return right(config);
    } catch (error) {
      console.error('[core/doc-transcription][update-config] error:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro ao salvar configuração',
          'DOC_TRANSCRIPTION_CONFIG_ERROR',
        ),
      );
    }
  }
}
