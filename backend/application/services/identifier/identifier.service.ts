import { Service } from 'fastify-decorators';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';

import { IdentifierContractService } from './identifier-contract.service';

@Service()
export default class MongooseIdentifierService implements IdentifierContractService {
  isValid(id: string): boolean {
    return mongoose.Types.ObjectId.isValid(id);
  }

  generate(): string {
    return randomUUID();
  }
}
