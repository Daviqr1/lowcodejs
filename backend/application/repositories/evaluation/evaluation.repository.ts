import { Service } from 'fastify-decorators';

import type { IEvaluation } from '@application/core/entity.core';
import type { FindOptions } from '@application/core/entity.core';
import { Evaluation as Model } from '@application/model/evaluation.model';

import type {
  EvaluationContractRepository,
  EvaluationCreatePayload,
  EvaluationQueryPayload,
  EvaluationUpdatePayload,
} from './evaluation-contract.repository';

@Service()
export default class EvaluationMongooseRepository implements EvaluationContractRepository {
  private readonly populateOptions = [{ path: 'user' }];

  private buildWhereClause(
    payload?: EvaluationQueryPayload,
  ): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    if (payload?.user) where.user = payload.user;

    return where;
  }

  private transform(entity: InstanceType<typeof Model>): IEvaluation {
    return {
      ...entity.toJSON({ flattenObjectIds: true }),
      _id: entity._id.toString(),
    };
  }

  async create(payload: EvaluationCreatePayload): Promise<IEvaluation> {
    const created = await Model.create(payload);
    const populated = await created.populate(this.populateOptions);
    return this.transform(populated);
  }

  async findByIdAndUser(
    _id: string,
    user: string,
    options?: FindOptions,
  ): Promise<IEvaluation | null> {
    const where: Record<string, unknown> = { _id, user };
    if (options?.trashed !== undefined) {
      where.trashed = options.trashed;
    }

    const evaluation = await Model.findOne(where).populate(
      this.populateOptions,
    );
    if (!evaluation) return null;

    return this.transform(evaluation);
  }

  async findMany(payload?: EvaluationQueryPayload): Promise<IEvaluation[]> {
    const where = this.buildWhereClause(payload);

    let skip: number | undefined;
    let take: number | undefined;

    if (payload?.page && payload?.perPage) {
      skip = (payload.page - 1) * payload.perPage;
      take = payload.perPage;
    }

    const evaluations = await Model.find(where)
      .populate(this.populateOptions)
      .sort({ createdAt: 'desc' })
      .skip(skip ?? 0)
      .limit(take ?? 0);

    return evaluations.map((e) => this.transform(e));
  }

  async update({
    _id,
    ...payload
  }: EvaluationUpdatePayload): Promise<IEvaluation> {
    const evaluation = await Model.findOne({ _id });

    if (!evaluation) throw new Error('Evaluation not found');

    evaluation.set(payload);

    await evaluation.save();

    const populated = await evaluation.populate(this.populateOptions);

    return this.transform(populated);
  }

  async delete(_id: string): Promise<void> {
    await Model.deleteOne({ _id });
  }

  async count(payload?: EvaluationQueryPayload): Promise<number> {
    const where = this.buildWhereClause(payload);
    return Model.countDocuments(where);
  }
}
