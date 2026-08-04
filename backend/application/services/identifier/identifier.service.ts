import { Service } from 'fastify-decorators';
import { randomUUID } from 'node:crypto';

import { OBJECT_ID_REGEX } from '@application/core/field-rules.core';

import { IdentifierContractService } from './identifier-contract.service';

@Service()
export default class MongooseIdentifierService implements IdentifierContractService {
  // Le do `OBJECT_ID_REGEX` em vez de `mongoose.Types.ObjectId.isValid`: o
  // mongoose tambem aceita qualquer string de 12 chars, entao um rotulo como
  // "Maria Silva!" passava por id valido.
  isValid(id: string): boolean {
    return OBJECT_ID_REGEX.test(id);
  }

  generate(): string {
    return randomUUID();
  }
}
