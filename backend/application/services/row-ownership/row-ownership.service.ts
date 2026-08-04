import { Service } from 'fastify-decorators';

import { RowOwnershipContractService } from './row-ownership-contract.service';

@Service()
export default class RowOwnershipService implements RowOwnershipContractService {
  resolveCreatorId(creator: unknown): string | null {
    if (creator === null || creator === undefined) return null;
    if (typeof creator === 'string') return creator;

    if (typeof creator === 'object') {
      // Objeto populado (User { _id }): usa o _id.
      if (
        '_id' in creator &&
        creator._id !== null &&
        creator._id !== undefined
      ) {
        return String(creator._id);
      }
      // ObjectId cru (findOne sem populate): ObjectId.toString() -> hex.
      return String(creator);
    }

    return null;
  }
}
