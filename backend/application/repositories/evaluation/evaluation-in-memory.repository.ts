import type { FindOptions, IEvaluation } from '@application/core/entity.core';
import { InMemoryCollectionRepository } from '@application/repositories/in-memory-base.repository';

import { EntityFixtures } from '../entity-fixtures';

import type {
  EvaluationContractRepository,
  EvaluationCreatePayload,
  EvaluationQueryPayload,
  EvaluationUpdatePayload,
} from './evaluation-contract.repository';

const fixtures = new EntityFixtures();

export default class EvaluationInMemoryRepository
  extends InMemoryCollectionRepository<IEvaluation>
  implements EvaluationContractRepository
{
  async create(payload: EvaluationCreatePayload): Promise<IEvaluation> {
    const evaluation: IEvaluation = {
      ...payload,
      _id: crypto.randomUUID(),
      // Double de teste: ref populada de usuário com defaults inertes.
      user: fixtures.makeUser(payload.user),
      createdAt: new Date(),
      updatedAt: new Date(),
      trashedAt: null,
      trashed: false,
    };
    this.items.push(evaluation);
    return evaluation;
  }

  async findByIdAndUser(
    _id: string,
    user: string,
    options?: FindOptions,
  ): Promise<IEvaluation | null> {
    const item = this.items.find((i) => {
      if (i._id !== _id) return false;
      if (i.user?._id !== user) return false;
      return this.matchesTrashed(i, options);
    });
    return item ?? null;
  }

  async findMany(payload?: EvaluationQueryPayload): Promise<IEvaluation[]> {
    let filtered = this.items;

    if (payload?.user) {
      filtered = filtered.filter((e) => e.user?._id === payload.user);
    }

    filtered = this.paginate(filtered, payload);

    return filtered;
  }

  async update({
    _id,
    ...payload
  }: EvaluationUpdatePayload): Promise<IEvaluation> {
    return this.patchById(_id, payload, 'Evaluation');
  }

  async delete(_id: string): Promise<void> {
    this.removeById(_id, 'Evaluation');
  }

  async count(payload?: EvaluationQueryPayload): Promise<number> {
    const filtered = await this.findMany({
      ...payload,
      page: undefined,
      perPage: undefined,
    });
    return filtered.length;
  }
}
