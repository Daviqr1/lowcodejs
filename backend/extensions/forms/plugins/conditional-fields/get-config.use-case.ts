import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { right } from '@application/core/either.core';
import type { ITable } from '@application/core/entity.core';
import type HTTPException from '@application/core/exception.core';

import { ConditionalFieldsConfigContractRepository } from './conditional-fields-config-contract.repository';
import type { ConditionalFieldsConfig } from './conditional-fields.types';

type Response = Either<HTTPException, ConditionalFieldsConfig>;

@Service()
export default class GetConditionalFieldsConfigUseCase {
  constructor(
    private readonly configRepository: ConditionalFieldsConfigContractRepository,
  ) {}

  async execute(table: ITable): Promise<Response> {
    const config = await this.configRepository.findByTable(
      table._id.toString(),
      table.slug,
    );

    return right(config);
  }
}
