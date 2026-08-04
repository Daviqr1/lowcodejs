import { Service } from 'fastify-decorators';

import { TypeGuardContractService } from './type-guard-contract.service';

@Service()
export default class TypeGuardService implements TypeGuardContractService {
  isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
