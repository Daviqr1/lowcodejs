import { Service } from 'fastify-decorators';

import type {
  TrashableEntity,
  TrashableRepository,
  TrashEligibility,
} from './trash-contract.service';
import { TrashContractService } from './trash-contract.service';

@Service()
export default class TrashService implements TrashContractService {
  async bulkTrash<TEntity extends TrashableEntity>(
    repository: TrashableRepository<TEntity>,
    _ids: string[],
  ): Promise<number> {
    return repository.updateMany({
      _ids,
      filterTrashed: false,
      data: { trashed: true, trashedAt: new Date() },
    });
  }

  async bulkRestore<TEntity extends TrashableEntity>(
    repository: TrashableRepository<TEntity>,
    _ids: string[],
  ): Promise<number> {
    return repository.updateMany({
      _ids,
      filterTrashed: true,
      data: { trashed: false, trashedAt: null },
    });
  }

  async bulkDelete<TEntity extends TrashableEntity>(
    repository: TrashableRepository<TEntity>,
    _ids: string[],
    isEligible?: TrashEligibility<TEntity>,
  ): Promise<number> {
    const eligibleIds: string[] = [];

    for (const _id of _ids) {
      const entity = await repository.findById(_id, { trashed: true });
      if (!entity) continue;
      if (!entity.trashed) continue;
      if (isEligible && !(await isEligible(entity))) continue;

      eligibleIds.push(entity._id);
    }

    return this.deleteEligible(repository, eligibleIds);
  }

  async emptyTrash<TEntity extends TrashableEntity>(
    repository: TrashableRepository<TEntity>,
    isEligible?: TrashEligibility<TEntity>,
  ): Promise<number> {
    const trashed = await repository.findManyTrashed();
    const eligibleIds: string[] = [];

    for (const entity of trashed) {
      if (isEligible && !(await isEligible(entity))) continue;

      eligibleIds.push(entity._id);
    }

    return this.deleteEligible(repository, eligibleIds);
  }

  private async deleteEligible<TEntity extends TrashableEntity>(
    repository: TrashableRepository<TEntity>,
    eligibleIds: string[],
  ): Promise<number> {
    if (eligibleIds.length === 0) return 0;

    return repository.deleteMany(eligibleIds);
  }
}
