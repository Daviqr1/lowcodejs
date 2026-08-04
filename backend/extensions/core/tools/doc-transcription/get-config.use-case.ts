import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';

import { DocTranscriptionConfigContractRepository } from './doc-transcription-config-contract.repository';
import type { IDocTranscriptionConfig } from './doc-transcription.types';

type Response = Either<HTTPException, IDocTranscriptionConfig>;

@Service()
export default class GetDocTranscriptionConfigUseCase {
  constructor(
    private readonly configRepository: DocTranscriptionConfigContractRepository,
  ) {}

  async execute(): Promise<Response> {
    const config = await this.configRepository.getOrCreate();
    return right(config);
  }
}
