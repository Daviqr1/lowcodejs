import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { right } from '@application/core/either.core';
import type HTTPException from '@application/core/exception.core';

import { CascadeDropdownQueryContractService } from './cascade-dropdown-query-contract.service';
import type { CascadeDropdownConfig } from './cascade-dropdown.types';

type Payload = {
  targetTableSlug: string;
  targetFieldId: string;
};

type Response = Either<HTTPException, CascadeDropdownConfig | null>;

@Service()
export default class GetCascadeDropdownConfigUseCase {
  constructor(private readonly query: CascadeDropdownQueryContractService) {}

  async execute(payload: Payload): Promise<Response> {
    const config = await this.query.findUsableConfig(
      payload.targetTableSlug,
      payload.targetFieldId,
    );

    return right(config);
  }
}
