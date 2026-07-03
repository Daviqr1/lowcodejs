import type { FindOptions, IEvaluation } from '@application/core/entity.core';

import { makeUser } from '../entity-fixtures';

import type {
  EvaluationContractRepository,
  EvaluationCreatePayload,
  EvaluationQueryPayload,
  EvaluationUpdatePayload,
} from './evaluation-contract.repository';

export default class EvaluationInMemoryRepository implements EvaluationContractRepository {
  items: IEvaluation[] = [];
  private _forcedErrors = new Map<string, Error>();

  simulateError(method: string, error: Error): void {
    this._forcedErrors.set(method, error);
  }

  private _checkError(method: string): void {
    const err = this._forcedErrors.get(method);
    if (err) {
      this._forcedErrors.delete(method);
      throw err;
    }
  }

  async create(payload: EvaluationCreatePayload): Promise<IEvaluation> {
    const evaluation: IEvaluation = {
      ...payload,
      _id: crypto.randomUUID(),
      // Double de teste: ref populada de usuário com defaults inertes.
      user: makeUser(payload.user),
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
      if (options?.trashed !== undefined) return i.trashed === options.trashed;
      return true;
    });
    return item ?? null;
  }

  async findMany(payload?: EvaluationQueryPayload): Promise<IEvaluation[]> {
    let filtered = this.items;

    if (payload?.user) {
      filtered = filtered.filter((e) => e.user?._id === payload.user);
    }

    if (payload?.page && payload?.perPage) {
      const start = (payload.page - 1) * payload.perPage;
      const end = start + payload.perPage;
      filtered = filtered.slice(start, end);
    }

    return filtered;
  }

  async update({
    _id,
    ...payload
  }: EvaluationUpdatePayload): Promise<IEvaluation> {
    const evaluation = this.items.find((e) => e._id === _id);
    if (!evaluation) throw new Error('Evaluation not found');
    Object.assign(evaluation, payload, { updatedAt: new Date() });
    return evaluation;
  }

  async delete(_id: string): Promise<void> {
    const index = this.items.findIndex((e) => e._id === _id);
    if (index === -1) throw new Error('Evaluation not found');
    this.items.splice(index, 1);
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
